import mongoose from "mongoose";
import dbConnect from "@/server/connectDb";
import RolloverJourneysModel from "@/server/models/rollover-journeys.model";
import CardRolloversModel from "@/server/models/card-rollovers.model";
import TransfersModel from "@/server/models/transfers.model";
import SourcesOfMoneyModel from "@/server/models/sources-of-money.model";
import {
    RolloverJourneyEndReason,
    type IFromEndRolloverJourneyData,
    type IFromUpdateRolloverJourneyData,
    type IRolloverJourneyPayment,
    type IRolloverJourneyStats,
} from "@/libs/interfaces/rolloverJourneysData";
import {
    errorResponseWithStatusCode,
    successResponse,
    unauthorizedResponse,
} from "../utils/responseServer";
import { getCurrentUser } from "../utils/getCurrentUser";

const NOTE_MAX = 500;
const SOURCE_FIELDS =
    "name archivedAt creditDetails.creditLimit creditDetails.currentDebt creditDetails.statementDate creditDetails.dueDate creditDetails.interestRate creditDetails.rolloverFeePercent";

type JourneyDoc = {
    _id: mongoose.Types.ObjectId;
    sourceOfMoneyId: mongoose.Types.ObjectId;
    startedAt: Date;
    baseAmount: number;
    endedAt?: Date | null;
    endReason?: RolloverJourneyEndReason | null;
    note?: string;
};

function rangeOf(journey: JourneyDoc) {
    const range: Record<string, Date> = { $gte: journey.startedAt };
    if (journey.endedAt) range.$lte = journey.endedAt;
    return range;
}

/**
 * Hành trình đang mở của thẻ, tạo mới nếu chưa có. Gọi khi ghi một lần đáo hạn:
 * `baseAmount` = A + x của lần đó (chỉ dùng khi tạo mới).
 */
export async function ensureOpenJourney(
    userId: string,
    cardId: mongoose.Types.ObjectId,
    rolledAt: Date,
    baseAmount: number,
) {
    const open = await RolloverJourneysModel.findOne({
        userId,
        sourceOfMoneyId: cardId,
        endedAt: null,
    });
    if (open) {
        // Lần đáo ghi lùi ngày trước mốc bắt đầu thì nới mốc
        if (rolledAt < open.startedAt) {
            await RolloverJourneysModel.updateOne({ _id: open._id }, { $set: { startedAt: rolledAt } });
        }
        return open;
    }
    return RolloverJourneysModel.create({
        userId,
        sourceOfMoneyId: cardId,
        startedAt: rolledAt,
        baseAmount: Math.round(baseAmount),
    });
}

/** Sau khi xóa một lần đáo: hành trình đang mở không còn lần nào thì xóa luôn. */
export async function pruneEmptyOpenJourney(userId: string, cardId: mongoose.Types.ObjectId) {
    const open = await RolloverJourneysModel.findOne({ userId, sourceOfMoneyId: cardId, endedAt: null });
    if (!open) return;
    const remaining = await CardRolloversModel.exists({
        userId,
        sourceOfMoneyId: cardId,
        rolledAt: rangeOf(open as JourneyDoc),
    });
    if (!remaining) await RolloverJourneysModel.deleteOne({ _id: open._id });
}

async function computeStats(userId: string, journey: JourneyDoc): Promise<IRolloverJourneyStats> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const [[rollover], [payment]] = await Promise.all([
        CardRolloversModel.aggregate<{ count: number; fee: number; last: Date }>([
            { $match: { userId: userObjectId, sourceOfMoneyId: journey.sourceOfMoneyId, rolledAt: rangeOf(journey) } },
            { $group: { _id: null, count: { $sum: 1 }, fee: { $sum: { $ifNull: ["$feeAmount", 0] } }, last: { $max: "$rolledAt" } } },
        ]),
        TransfersModel.aggregate<{ paid: number }>([
            { $match: { userId: userObjectId, toSourceId: journey.sourceOfMoneyId, transferredAt: rangeOf(journey) } },
            { $group: { _id: null, paid: { $sum: "$amount" } } },
        ]),
    ]);
    return {
        rolloverCount: rollover?.count ?? 0,
        totalFee: rollover?.fee ?? 0,
        totalPaid: payment?.paid ?? 0,
        lastRolledAt: rollover?.last ? rollover.last.toISOString() : null,
    };
}

/**
 * Hành trình đang mở mà thẻ đã về 0 dư nợ (và đã có ít nhất một lần đáo) thì tự đóng với lý do
 * "Đã sạch nợ". Kiểm tra lười khi đọc, không cần hook vào mọi chỗ cập nhật dư nợ.
 */
async function autoClosePaidOff(userId: string, journey: JourneyDoc) {
    if (journey.endedAt) return journey;
    const card = await SourcesOfMoneyModel.findOne({ _id: journey.sourceOfMoneyId, userId })
        .select("creditDetails.currentDebt")
        .lean<{ creditDetails?: { currentDebt?: number } }>();
    const debt = card?.creditDetails?.currentDebt ?? 0;
    if (debt > 0) return journey;
    const hasRollover = await CardRolloversModel.exists({
        userId,
        sourceOfMoneyId: journey.sourceOfMoneyId,
        rolledAt: rangeOf(journey),
    });
    if (!hasRollover) return journey;
    const endedAt = new Date();
    await RolloverJourneysModel.updateOne(
        { _id: journey._id, endedAt: null },
        { $set: { endedAt, endReason: RolloverJourneyEndReason.PAID_OFF } },
    );
    return { ...journey, endedAt, endReason: RolloverJourneyEndReason.PAID_OFF };
}

async function withStats(userId: string, journey: JourneyDoc) {
    const closed = await autoClosePaidOff(userId, journey);
    const stats = await computeStats(userId, closed);
    return { ...closed, stats };
}

export class RolloverJourneysService {
    /** Mọi hành trình của user (đang mở trước, rồi mới nhất trước), kèm thống kê. */
    static async getJourneys(cardId?: string) {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) return unauthorizedResponse();

        const filter: Record<string, unknown> = { userId: user.userId };
        if (cardId) filter.sourceOfMoneyId = cardId;
        const journeys = await RolloverJourneysModel.find(filter)
            .populate("sourceOfMoneyId", SOURCE_FIELDS)
            .sort({ endedAt: 1, startedAt: -1 })
            .lean<(JourneyDoc & { sourceOfMoneyId: unknown })[]>();

        const items = await Promise.all(
            journeys.map(async (journey) => {
                const source = journey.sourceOfMoneyId as { _id: mongoose.Types.ObjectId };
                const plain = { ...journey, sourceOfMoneyId: source._id };
                const result = await withStats(user.userId, plain);
                return { ...result, sourceOfMoneyId: journey.sourceOfMoneyId };
            }),
        );
        // Đang mở lên đầu, rồi theo ngày bắt đầu giảm dần
        items.sort((a, b) => {
            if (!a.endedAt !== !b.endedAt) return a.endedAt ? 1 : -1;
            return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
        });
        return successResponse(items);
    }

    /** Chi tiết một hành trình: các lần đáo (tăng dần) và các khoản tự trả trong khoảng. */
    static async getJourneyDetail(id: string) {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) return unauthorizedResponse();
        if (!mongoose.isValidObjectId(id)) {
            return errorResponseWithStatusCode("Không tìm thấy hành trình", 404);
        }

        const journey = await RolloverJourneysModel.findOne({ _id: id, userId: user.userId }).lean<JourneyDoc>();
        if (!journey) return errorResponseWithStatusCode("Không tìm thấy hành trình", 404);

        const result = await withStats(user.userId, journey);
        const [source, rollovers, transfers] = await Promise.all([
            SourcesOfMoneyModel.findOne({ _id: journey.sourceOfMoneyId, userId: user.userId })
                .select(SOURCE_FIELDS)
                .lean(),
            CardRolloversModel.find({
                userId: user.userId,
                sourceOfMoneyId: journey.sourceOfMoneyId,
                rolledAt: rangeOf(result),
            })
                .populate("feeCategoryId", "name archivedAt")
                .populate("paymentTransferId", "amount transferredAt fromSourceId")
                .sort({ rolledAt: 1, createdAt: 1 })
                .lean<{ _id: mongoose.Types.ObjectId; paymentTransferId?: { _id: mongoose.Types.ObjectId } | null }[]>(),
            TransfersModel.find({
                userId: user.userId,
                toSourceId: journey.sourceOfMoneyId,
                transferredAt: rangeOf(result),
            })
                .populate("fromSourceId", "name archivedAt")
                .sort({ transferredAt: 1, createdAt: 1 })
                .lean<{ _id: mongoose.Types.ObjectId; amount: number; transferredAt: Date; fromSourceId?: unknown; note?: string }[]>(),
        ]);

        const rolloverByTransfer = new Map<string, string>();
        for (const rollover of rollovers) {
            if (rollover.paymentTransferId?._id) {
                rolloverByTransfer.set(rollover.paymentTransferId._id.toString(), rollover._id.toString());
            }
        }
        const payments: IRolloverJourneyPayment[] = transfers.map((transfer) => ({
            _id: transfer._id.toString(),
            amount: transfer.amount,
            transferredAt: transfer.transferredAt.toISOString(),
            fromSource: (transfer.fromSourceId as IRolloverJourneyPayment["fromSource"]) ?? null,
            note: transfer.note,
            rolloverId: rolloverByTransfer.get(transfer._id.toString()) ?? null,
        }));

        return successResponse({
            journey: { ...result, sourceOfMoneyId: source ?? journey.sourceOfMoneyId },
            rollovers,
            payments,
        });
    }

    static async endJourney(id: string, data: IFromEndRolloverJourneyData) {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) return unauthorizedResponse();

        const endReason = data.endReason;
        if (!Object.values(RolloverJourneyEndReason).includes(endReason)) {
            return errorResponseWithStatusCode("Lý do kết thúc không hợp lệ", 400);
        }
        const note = typeof data.note === "string" ? data.note.trim().slice(0, NOTE_MAX) : undefined;
        const updated = await RolloverJourneysModel.findOneAndUpdate(
            { _id: id, userId: user.userId, endedAt: null },
            { $set: { endedAt: new Date(), endReason, ...(note != null ? { note } : {}) } },
            { returnDocument: "after" },
        );
        if (!updated) {
            return errorResponseWithStatusCode("Hành trình không tồn tại hoặc đã kết thúc", 404);
        }
        return successResponse(updated.toJSON(), "Đã kết thúc hành trình");
    }

    static async updateJourney(id: string, data: IFromUpdateRolloverJourneyData) {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) return unauthorizedResponse();

        const $set: Record<string, unknown> = {};
        if (data.baseAmount != null) {
            const baseAmount = Number(data.baseAmount);
            if (!Number.isFinite(baseAmount) || baseAmount <= 0) {
                return errorResponseWithStatusCode("Số tiền gốc phải lớn hơn 0", 400);
            }
            $set.baseAmount = Math.round(baseAmount);
        }
        if (typeof data.note === "string") $set.note = data.note.trim().slice(0, NOTE_MAX);
        if (Object.keys($set).length === 0) {
            return errorResponseWithStatusCode("Không có gì để cập nhật", 400);
        }
        const updated = await RolloverJourneysModel.findOneAndUpdate(
            { _id: id, userId: user.userId },
            { $set },
            { returnDocument: "after" },
        );
        if (!updated) return errorResponseWithStatusCode("Không tìm thấy hành trình", 404);
        return successResponse(updated.toJSON(), "Đã cập nhật hành trình");
    }
}
