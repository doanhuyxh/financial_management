import mongoose from "mongoose";
import dbConnect from "@/server/connectDb";
import CardRolloversModel from "@/server/models/card-rollovers.model";
import ExpensesModel from "@/server/models/expenses.model";
import CategoriesModel from "@/server/models/categories.model";
import SourcesOfMoneyModel from "@/server/models/sources-of-money.model";
import type {
    IFromCardRolloverData,
    IPaginatedCardRolloversQuery,
} from "@/libs/interfaces/cardRolloversData";
import { CardFeeType } from "@/libs/interfaces/expensesData";
import { CategoryKind } from "@/libs/interfaces/categoriesData";
import { SourcesOfMoneyType } from "@/libs/interfaces/sourcesOfMoneyData";
import { calcPercentFee } from "@/libs/utils/cardFee";
import {
    errorResponseWithStatusCode,
    successResponse,
    successResponsePageNation,
    unauthorizedResponse,
} from "../utils/responseServer";
import { getCurrentUser } from "../utils/getCurrentUser";
import { normalizePagination } from "../utils/pagination";
import { NOT_ARCHIVED } from "../utils/archived";
import { formatMoney } from "@/libs/utils/formatMoney";
import { createTransferRecord, deleteTransferRecord } from "./transfers.service";
import { ensureOpenJourney, pruneEmptyOpenJourney } from "./rollover-journeys.service";

const PROVIDER_MAX = 100;
const NOTE_MAX = 500;
const EPSILON = 0.0001;

type CardDoc = {
    _id: mongoose.Types.ObjectId;
    name: string;
    type: SourcesOfMoneyType;
    creditDetails?: { creditLimit?: number; currentDebt?: number };
};

/**
 * Đáo hạn: bên dịch vụ ứng `amount` trả vào thẻ, rồi quẹt lại `amount + feeAmount`.
 * Hai bước triệt tiêu nhau nên tiền của người dùng không đổi, dư nợ thẻ chỉ tăng đúng phí.
 */
function normalizePayload(data: IFromCardRolloverData) {
    const sourceOfMoneyId = data.sourceOfMoneyId?.trim();
    const amount = Number(data.amount);
    const feePercent = data.feePercent == null || data.feePercent === ("" as unknown)
        ? 0
        : Number(data.feePercent);
    const rawFeeAmount =
        data.feeAmount == null || data.feeAmount === ("" as unknown)
            ? undefined
            : Number(data.feeAmount);
    const feeCategoryId = data.feeCategoryId?.trim() || "";
    const paymentAmount =
        data.paymentAmount == null || data.paymentAmount === ("" as unknown)
            ? 0
            : Number(data.paymentAmount);
    const paymentSourceId = data.paymentSourceId?.trim() || "";
    const provider = (data.provider ?? "").trim().slice(0, PROVIDER_MAX);
    const note = (data.note ?? "").trim().slice(0, NOTE_MAX);
    const rolledAt = data.rolledAt ? new Date(data.rolledAt) : new Date();

    if (!sourceOfMoneyId) throw new Error("Thẻ tín dụng là bắt buộc");
    if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Số tiền đáo hạn phải lớn hơn 0");
    }
    if (!Number.isFinite(feePercent) || feePercent < 0 || feePercent > 100) {
        throw new Error("Phí đáo hạn phải từ 0 đến 100%");
    }
    if (rawFeeAmount != null && (!Number.isFinite(rawFeeAmount) || rawFeeAmount < 0)) {
        throw new Error("Phí đáo hạn phải >= 0");
    }
    if (Number.isNaN(rolledAt.getTime())) {
        throw new Error("Ngày đáo hạn không hợp lệ");
    }
    if (!Number.isFinite(paymentAmount) || paymentAmount < 0) {
        throw new Error("Số tiền tự trả phải >= 0");
    }
    if (paymentAmount > 0 && !paymentSourceId) {
        throw new Error("Cần chọn nguồn trả khi tự trả một phần");
    }

    const feeAmount =
        rawFeeAmount != null ? Math.round(rawFeeAmount) : calcPercentFee(amount, feePercent);
    if (feeAmount > 0 && !feeCategoryId) {
        throw new Error("Danh mục chi tiêu phí là bắt buộc khi có phí");
    }

    return {
        sourceOfMoneyId,
        amount: Math.round(amount),
        feePercent: Math.round(feePercent * 100) / 100,
        feeAmount,
        feeCategoryId,
        paymentAmount: Math.round(paymentAmount),
        paymentSourceId,
        provider,
        note,
        rolledAt,
    };
}

/** Tăng dư nợ thẻ đúng bằng phí; điều kiện hạn mức và dư nợ ≥ số tiền đáo nằm trong filter. */
async function addFeeToDebt(userId: string, card: CardDoc, amount: number, feeAmount: number) {
    const limit = card.creditDetails?.creditLimit ?? 0;
    const updated = await SourcesOfMoneyModel.findOneAndUpdate(
        {
            _id: card._id,
            userId,
            type: SourcesOfMoneyType.CREDIT_CARD,
            ...NOT_ARCHIVED,
            "creditDetails.currentDebt": {
                $gte: amount - EPSILON,
                $lte: limit - feeAmount + EPSILON,
            },
        },
        { $inc: { "creditDetails.currentDebt": feeAmount } },
        { returnDocument: "after" },
    );
    if (!updated) {
        throw new Error(
            "Không ghi được phí: dư nợ vừa thay đổi hoặc phí vượt hạn mức còn lại. Hãy tải lại và thử lại",
        );
    }
    return updated;
}

/** Hoàn phí khỏi dư nợ (xóa đáo hạn hoặc rollback). */
async function removeFeeFromDebt(userId: string, cardId: mongoose.Types.ObjectId, feeAmount: number) {
    const updated = await SourcesOfMoneyModel.findOneAndUpdate(
        {
            _id: cardId,
            userId,
            type: SourcesOfMoneyType.CREDIT_CARD,
            "creditDetails.currentDebt": { $gte: feeAmount - EPSILON },
        },
        { $inc: { "creditDetails.currentDebt": -feeAmount } },
        { returnDocument: "after" },
    );
    if (!updated) {
        throw new Error("Dư nợ hiện tại không đủ để hoàn phí đáo hạn");
    }
    return updated;
}

function populateQuery<T>(query: T) {
    return (query as any)
        .populate("sourceOfMoneyId", "name archivedAt")
        .populate("feeCategoryId", "name archivedAt")
        .populate({
            path: "paymentTransferId",
            select: "amount transferredAt fromSourceId",
            populate: { path: "fromSourceId", select: "name archivedAt" },
        });
}

export class CardRolloversService {
    static async getCardRollovers(query: IPaginatedCardRolloversQuery) {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) return unauthorizedResponse();

        const { page, limit } = normalizePagination(query.page, query.limit, 10);
        const filter: Record<string, unknown> = { userId: user.userId };
        if (query.sourceOfMoneyId) filter.sourceOfMoneyId = query.sourceOfMoneyId;
        if (query.from || query.to) {
            const rolledAt: Record<string, Date> = {};
            if (query.from) rolledAt.$gte = new Date(query.from);
            if (query.to) {
                const end = new Date(query.to);
                end.setHours(23, 59, 59, 999);
                rolledAt.$lte = end;
            }
            filter.rolledAt = rolledAt;
        }

        const [items, total] = await Promise.all([
            populateQuery(
                CardRolloversModel.find(filter)
                    .skip((page - 1) * limit)
                    .limit(limit)
                    .sort({ rolledAt: -1, createdAt: -1 }),
            ).lean(),
            CardRolloversModel.countDocuments(filter),
        ]);

        return successResponsePageNation(items, total, page, limit);
    }

    static async createCardRollover(data: IFromCardRolloverData) {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) return unauthorizedResponse();

        try {
            const payload = normalizePayload(data);
            const card = (await SourcesOfMoneyModel.findOne({
                _id: payload.sourceOfMoneyId,
                userId: user.userId,
                ...NOT_ARCHIVED,
            }).lean()) as CardDoc | null;
            if (!card) throw new Error("Không tìm thấy thẻ tín dụng");
            if (card.type !== SourcesOfMoneyType.CREDIT_CARD) {
                throw new Error("Đáo hạn chỉ áp dụng cho thẻ tín dụng");
            }

            // 0. Tự trả một phần: Transfer nguồn → thẻ (giảm dư nợ) trước, lỗi phía sau thì xóa lại
            let paymentTransferId: mongoose.Types.ObjectId | undefined;
            if (payload.paymentAmount > 0) {
                const debtBefore = card.creditDetails?.currentDebt ?? 0;
                if (payload.paymentAmount + payload.amount > debtBefore + EPSILON) {
                    throw new Error(
                        `Tự trả + dịch vụ ứng (${formatMoney(payload.paymentAmount + payload.amount)}) vượt dư nợ đang nợ (${formatMoney(debtBefore)})`,
                    );
                }
                const transfer = await createTransferRecord(user.userId, {
                    fromSourceId: payload.paymentSourceId,
                    toSourceId: payload.sourceOfMoneyId,
                    amount: payload.paymentAmount,
                    transferredAt: payload.rolledAt,
                    note: payload.note || `Tự trả một phần khi đáo hạn ${card.name}`,
                });
                paymentTransferId = transfer?._id as mongoose.Types.ObjectId;
                if (card.creditDetails) {
                    card.creditDetails.currentDebt = debtBefore - payload.paymentAmount;
                }
            }
            const rollbackPayment = async () => {
                if (paymentTransferId) {
                    await deleteTransferRecord(user.userId, paymentTransferId.toString());
                }
            };

            try {
            const debt = card.creditDetails?.currentDebt ?? 0;
            const limit = card.creditDetails?.creditLimit ?? 0;
            if (payload.amount > debt + EPSILON) {
                throw new Error(`Số tiền đáo hạn tối đa bằng dư nợ đang nợ (${formatMoney(debt)})`);
            }
            if (debt + payload.feeAmount > limit + EPSILON) {
                throw new Error(
                    `Phí đáo hạn vượt hạn mức còn lại (${formatMoney(Math.max(0, limit - debt))})`,
                );
            }

            if (payload.feeAmount > 0) {
                const category = await CategoriesModel.findOne({
                    _id: payload.feeCategoryId,
                    userId: user.userId,
                    ...NOT_ARCHIVED,
                }).select("_id kind");
                if (!category) throw new Error("Không tìm thấy danh mục phí");
                if (category.kind && category.kind !== CategoryKind.EXPENSE) {
                    throw new Error("Danh mục phí phải là danh mục chi tiêu");
                }
            }

            // 1. Dư nợ += phí (điều kiện trong filter)
            if (payload.feeAmount > 0) {
                await addFeeToDebt(user.userId, card, payload.amount, payload.feeAmount);
            }

            let feeExpenseId: mongoose.Types.ObjectId | undefined;
            try {
                // 2. Expense phí (chỉ ghi nhận, không trừ dư nợ lần nữa)
                if (payload.feeAmount > 0) {
                    const feeExpense = await ExpensesModel.create({
                        userId: user.userId,
                        categoryId: new mongoose.Types.ObjectId(payload.feeCategoryId),
                        sourceOfMoneyId: card._id,
                        amount: payload.feeAmount,
                        note:
                            payload.note ||
                            `Phí đáo hạn ${formatMoney(payload.amount)}${payload.provider ? ` · ${payload.provider}` : ""}`,
                        spentAt: payload.rolledAt,
                        skipBalanceAdjust: true,
                        cardFeeType: CardFeeType.ROLLOVER_FEE,
                    });
                    feeExpenseId = feeExpense._id as mongoose.Types.ObjectId;
                }

                // 3. Bản ghi đáo hạn
                const created = await CardRolloversModel.create({
                    userId: user.userId,
                    sourceOfMoneyId: card._id,
                    amount: payload.amount,
                    feePercent: payload.feePercent,
                    feeAmount: payload.feeAmount,
                    feeCategoryId: payload.feeCategoryId
                        ? new mongoose.Types.ObjectId(payload.feeCategoryId)
                        : undefined,
                    feeExpenseId,
                    paymentTransferId,
                    provider: payload.provider,
                    note: payload.note,
                    rolledAt: payload.rolledAt,
                });

                // 4. Hành trình: mở mới nếu thẻ chưa có hành trình đang mở (gốc = A + x).
                // Chỉ là dữ liệu phụ nên lỗi ở đây không hoàn lại lần đáo đã ghi.
                try {
                    await ensureOpenJourney(
                        user.userId,
                        card._id,
                        payload.rolledAt,
                        payload.amount + payload.paymentAmount,
                    );
                } catch (journeyError) {
                    console.warn("Không mở được hành trình đáo hạn", journeyError);
                }

                const populated = await populateQuery(
                    CardRolloversModel.findOne({ _id: created._id, userId: user.userId }),
                ).lean();
                return successResponse(populated, "Đã ghi đáo hạn thẻ");
            } catch (createError) {
                if (feeExpenseId) {
                    await ExpensesModel.findOneAndDelete({ _id: feeExpenseId, userId: user.userId });
                }
                if (payload.feeAmount > 0) {
                    await removeFeeFromDebt(user.userId, card._id, payload.feeAmount);
                }
                throw createError;
            }
            } catch (afterPaymentError) {
                await rollbackPayment();
                throw afterPaymentError;
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Ghi đáo hạn thất bại";
            return errorResponseWithStatusCode(message, 400);
        }
    }

    /** `deletePayment`: xóa luôn khoản tự trả đi kèm (Transfer) sau khi xóa đáo hạn. */
    static async deleteCardRollover(id: string, options: { deletePayment?: boolean } = {}) {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) return unauthorizedResponse();

        try {
            const existing = await CardRolloversModel.findOne({ _id: id, userId: user.userId });
            if (!existing) {
                return errorResponseWithStatusCode("Không tìm thấy lần đáo hạn", 404);
            }

            // Thẻ đã lưu trữ hoặc xóa hẳn: không còn dư nợ để hoàn
            const cardActive = Boolean(
                await SourcesOfMoneyModel.exists({
                    _id: existing.sourceOfMoneyId,
                    userId: user.userId,
                    ...NOT_ARCHIVED,
                }),
            );
            const feeAmount = existing.feeAmount || 0;

            // 1. Hoàn phí khỏi dư nợ
            if (cardActive && feeAmount > 0) {
                await removeFeeFromDebt(user.userId, existing.sourceOfMoneyId, feeAmount);
            }

            try {
                // 2. Expense phí chưa từng trừ dư nợ: chỉ xóa document
                if (existing.feeExpenseId) {
                    await ExpensesModel.findOneAndDelete({
                        _id: existing.feeExpenseId,
                        userId: user.userId,
                    });
                }
                // 3. Xóa bản ghi
                await CardRolloversModel.findOneAndDelete({ _id: id, userId: user.userId });
            } catch (deleteError) {
                if (cardActive && feeAmount > 0) {
                    await SourcesOfMoneyModel.updateOne(
                        { _id: existing.sourceOfMoneyId, userId: user.userId },
                        { $inc: { "creditDetails.currentDebt": feeAmount } },
                    );
                }
                throw deleteError;
            }

            // Khoản tự trả đi kèm: xóa sau cùng, lỗi thì báo nhưng đáo hạn đã xóa xong
            if (options.deletePayment && existing.paymentTransferId) {
                try {
                    await deleteTransferRecord(user.userId, existing.paymentTransferId.toString());
                } catch (paymentError) {
                    await pruneEmptyOpenJourney(user.userId, existing.sourceOfMoneyId);
                    const message =
                        paymentError instanceof Error ? paymentError.message : "Xóa khoản tự trả thất bại";
                    return errorResponseWithStatusCode(
                        `Đã xóa lần đáo hạn nhưng không xóa được khoản tự trả: ${message}`,
                        400,
                    );
                }
            }
            await pruneEmptyOpenJourney(user.userId, existing.sourceOfMoneyId);

            return successResponse(null, "Đã xóa lần đáo hạn");
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Xóa đáo hạn thất bại";
            return errorResponseWithStatusCode(message, 400);
        }
    }
}
