import dbConnect from "@/server/connectDb";
import SourcesOfMoneyModel from "@/server/models/sources-of-money.model";
import ExpensesModel from "@/server/models/expenses.model";
import IncomesModel from "@/server/models/incomes.model";
import TransfersModel from "@/server/models/transfers.model";
import BalanceAdjustmentsModel from "@/server/models/balance-adjustments.model";
import { BalanceAdjustmentField } from "@/libs/interfaces/balanceAdjustmentsData";
import type { IDefaultQuery } from "@/libs/interfaces/DefaultQuery";
import {
    IFromSourcesOfMoneyData,
    IPaginatedSourcesOfMoneyQuery,
    IReorderSourcesOfMoneyData,
    SourcesOfMoneyType,
} from "@/libs/interfaces/sourcesOfMoneyData";
import {
    errorResponseWithStatusCode,
    successResponse,
    successResponsePageNation,
    unauthorizedResponse,
} from "../utils/responseServer";
import { getCurrentUser } from "../utils/getCurrentUser";
import { escapeRegex } from "../utils/escapeRegex";
import { normalizePagination } from "../utils/pagination";
import { NOT_ARCHIVED } from "../utils/archived";
import { getTrackedAmount } from "@/libs/utils/trackedAmount";

function normalizePayload(data: IFromSourcesOfMoneyData) {
    const name = data.name?.trim();
    const type = data.type;

    if (!name) {
        throw new Error("Tên nguồn tiền là bắt buộc");
    }
    if (!type || !Object.values(SourcesOfMoneyType).includes(type)) {
        throw new Error("Loại nguồn tiền không hợp lệ");
    }

    if (type === SourcesOfMoneyType.CREDIT_CARD) {
        const creditLimit = Number(data.creditDetails?.creditLimit ?? 0);
        const currentDebt = Number(data.creditDetails?.currentDebt ?? 0);
        const statementDate = data.creditDetails?.statementDate;
        const dueDate = data.creditDetails?.dueDate;

        if (creditLimit < 0 || currentDebt < 0) {
            throw new Error("Hạn mức và dư nợ phải >= 0");
        }
        if (currentDebt > creditLimit) {
            throw new Error("Dư nợ không được lớn hơn hạn mức");
        }
        if (
            statementDate != null &&
            (statementDate < 1 || statementDate > 31)
        ) {
            throw new Error("Ngày sao kê phải từ 1 đến 31");
        }
        if (dueDate != null && (dueDate < 1 || dueDate > 31)) {
            throw new Error("Ngày đến hạn phải từ 1 đến 31");
        }

        return {
            name,
            type,
            balance: 0,
            creditDetails: {
                creditLimit,
                currentDebt,
                ...(statementDate != null ? { statementDate } : {}),
                ...(dueDate != null ? { dueDate } : {}),
            },
            metadata: data.metadata ?? {},
        };
    }

    const balance = Number(data.balance ?? 0);
    if (Number.isNaN(balance) || balance < 0) {
        throw new Error("Số dư phải là số >= 0");
    }

    return {
        name,
        type,
        balance,
        creditDetails: undefined,
        metadata: data.metadata ?? {},
    };
}

async function hasTransactions(userId: string, sourceId: string) {
    const [expense, income, transfer] = await Promise.all([
        ExpensesModel.exists({ userId, sourceOfMoneyId: sourceId }),
        IncomesModel.exists({ userId, sourceOfMoneyId: sourceId }),
        TransfersModel.exists({
            userId,
            $or: [{ fromSourceId: sourceId }, { toSourceId: sourceId }],
        }),
    ]);
    return Boolean(expense || income || transfer);
}

const ADJUSTMENT_NOTE_MAX = 200;

type ExistingSource = {
    type: SourcesOfMoneyType;
    balance?: number;
    creditDetails?: { currentDebt?: number };
};

function getTrackedPath(type: SourcesOfMoneyType) {
    return type === SourcesOfMoneyType.CREDIT_CARD ? "creditDetails.currentDebt" : "balance";
}

function getAdjustmentField(type: SourcesOfMoneyType) {
    return type === SourcesOfMoneyType.CREDIT_CARD
        ? BalanceAdjustmentField.CREDIT_DEBT
        : BalanceAdjustmentField.BALANCE;
}

function normalizeAdjustmentNote(note: unknown) {
    return typeof note === "string" ? note.trim().slice(0, ADJUSTMENT_NOTE_MAX) : "";
}

export class SourcesOfMoneyService {
    static async getSourcesOfMoney(query: IPaginatedSourcesOfMoneyQuery) {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) {
            return unauthorizedResponse();
        }

        const { search = "", type } = query;
        const { page, limit } = normalizePagination(query.page, query.limit, 100);
        const filter: Record<string, unknown> = { userId: user.userId, ...NOT_ARCHIVED };

        if (search) {
            filter.name = { $regex: escapeRegex(search), $options: "i" };
        }
        if (type) {
            filter.type = type;
        }

        // Backfill sortOrder for legacy documents
        const missingSortOrder = await SourcesOfMoneyModel.countDocuments({
            userId: user.userId,
            $or: [{ sortOrder: { $exists: false } }, { sortOrder: null }],
        });
        if (missingSortOrder > 0) {
            const all = await SourcesOfMoneyModel.find({ userId: user.userId })
                .sort({ createdAt: 1 })
                .select("_id");
            await Promise.all(
                all.map((doc, index) =>
                    SourcesOfMoneyModel.updateOne(
                        { _id: doc._id },
                        { $set: { sortOrder: index } },
                    ),
                ),
            );
        }

        const [docs, total] = await Promise.all([
            SourcesOfMoneyModel.find(filter)
                .skip((page - 1) * limit)
                .limit(limit)
                .sort({ sortOrder: 1, createdAt: 1 }),
            SourcesOfMoneyModel.countDocuments(filter),
        ]);

        const items = docs.map((doc) => doc.toJSON());
        return successResponsePageNation(items, total, page, limit);
    }

    static async createSourcesOfMoney(data: IFromSourcesOfMoneyData) {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) {
            return unauthorizedResponse();
        }

        try {
            const payload = normalizePayload(data);
            const last = await SourcesOfMoneyModel.findOne({ userId: user.userId })
                .sort({ sortOrder: -1 })
                .select("sortOrder")
                .lean();
            const sortOrder = (last?.sortOrder ?? -1) + 1;

            const created = await SourcesOfMoneyModel.create({
                ...payload,
                sortOrder,
                userId: user.userId,
            });

            // Ghi số dư/dư nợ ban đầu để lịch sử điều chỉnh đối chiếu được từ 0
            const initialAmount = getTrackedAmount(payload);
            if (initialAmount !== 0) {
                try {
                    await BalanceAdjustmentsModel.create({
                        userId: user.userId,
                        sourceOfMoneyId: created._id,
                        field: getAdjustmentField(payload.type),
                        previousValue: 0,
                        newValue: initialAmount,
                        delta: initialAmount,
                        note: normalizeAdjustmentNote(data.adjustmentNote) || "Số dư ban đầu",
                    });
                } catch (adjustmentError) {
                    await SourcesOfMoneyModel.deleteOne({ _id: created._id, userId: user.userId });
                    throw adjustmentError;
                }
            }

            return successResponse(created.toJSON(), "Tạo nguồn tiền thành công");
        } catch (error: unknown) {
            const message =
                error instanceof Error ? error.message : "Tạo nguồn tiền thất bại";
            return errorResponseWithStatusCode(message, 400);
        }
    }

    static async updateSourcesOfMoney(id: string, data: IFromSourcesOfMoneyData) {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) {
            return unauthorizedResponse();
        }

        try {
            const payload = normalizePayload(data);

            const existing = await SourcesOfMoneyModel.findOne({
                _id: id,
                userId: user.userId,
                ...NOT_ARCHIVED,
            })
                .select("type balance creditDetails")
                .lean<ExistingSource>();
            if (!existing) {
                return errorResponseWithStatusCode("Không tìm thấy nguồn tiền", 404);
            }

            // Balance reversal logic depends on CC vs non-CC, so history must not cross that line.
            const wasCreditCard = existing.type === SourcesOfMoneyType.CREDIT_CARD;
            const isCreditCard = payload.type === SourcesOfMoneyType.CREDIT_CARD;
            const sameKind = wasCreditCard === isCreditCard;
            if (!sameKind && (await hasTransactions(user.userId, id))) {
                return errorResponseWithStatusCode(
                    "Không thể đổi giữa thẻ tín dụng và loại khác khi nguồn tiền đã có giao dịch",
                    400,
                );
            }

            const newAmount = getTrackedAmount(payload);
            const expected = Number(data.expectedAmount);
            const expectedAmount =
                data.expectedAmount != null && Number.isFinite(expected)
                    ? expected
                    : getTrackedAmount(existing);
            // Người dùng không sửa số này → giữ số trong DB (có thể đã đổi do giao dịch khác)
            const amountChanged = !sameKind || newAmount !== expectedAmount;
            const trackedPath = getTrackedPath(payload.type);

            const filter: Record<string, unknown> = {
                _id: id,
                userId: user.userId,
                type: existing.type,
                ...NOT_ARCHIVED,
            };
            const $set: Record<string, unknown> = {
                name: payload.name,
                type: payload.type,
                metadata: payload.metadata,
            };
            const $unset: Record<string, 1> = {};

            if (payload.creditDetails) {
                const { creditLimit, statementDate, dueDate } = payload.creditDetails;
                $set.balance = 0;
                $set["creditDetails.creditLimit"] = creditLimit;
                if (statementDate != null) $set["creditDetails.statementDate"] = statementDate;
                else $unset["creditDetails.statementDate"] = 1;
                if (dueDate != null) $set["creditDetails.dueDate"] = dueDate;
                else $unset["creditDetails.dueDate"] = 1;
                if (!amountChanged) {
                    // Giữ dư nợ hiện tại: hạn mức mới không được thấp hơn nó
                    // `$not: $gt` cũng khớp thẻ cũ thiếu currentDebt (coi như 0)
                    filter["creditDetails.currentDebt"] = { $not: { $gt: creditLimit } };
                }
            } else {
                $unset.creditDetails = 1;
            }
            if (amountChanged) {
                $set[trackedPath] = newAmount;
                if (sameKind) filter[trackedPath] = expectedAmount;
            }

            const updated = await SourcesOfMoneyModel.findOneAndUpdate(
                filter,
                Object.keys($unset).length > 0 ? { $set, $unset } : { $set },
                { returnDocument: "after" },
            );

            if (!updated) {
                if (amountChanged && sameKind) {
                    return errorResponseWithStatusCode(
                        `${isCreditCard ? "Dư nợ" : "Số dư"} vừa thay đổi do giao dịch khác. Hãy tải lại và thử lại`,
                        409,
                    );
                }
                if (isCreditCard && !amountChanged) {
                    return errorResponseWithStatusCode(
                        "Hạn mức mới không được thấp hơn dư nợ hiện tại",
                        400,
                    );
                }
                return errorResponseWithStatusCode("Không tìm thấy nguồn tiền", 404);
            }

            // Đổi loại (chỉ khi chưa có giao dịch) là thiết lập lại, không tính là điều chỉnh
            if (amountChanged && sameKind) {
                try {
                    await BalanceAdjustmentsModel.create({
                        userId: user.userId,
                        sourceOfMoneyId: updated._id,
                        field: getAdjustmentField(payload.type),
                        previousValue: expectedAmount,
                        newValue: newAmount,
                        delta: newAmount - expectedAmount,
                        note: normalizeAdjustmentNote(data.adjustmentNote),
                    });
                } catch (adjustmentError) {
                    await SourcesOfMoneyModel.updateOne(
                        { _id: id, userId: user.userId, [trackedPath]: newAmount },
                        { $set: { [trackedPath]: expectedAmount } },
                    );
                    throw adjustmentError;
                }
            }

            return successResponse(updated.toJSON(), "Cập nhật nguồn tiền thành công");
        } catch (error: unknown) {
            const message =
                error instanceof Error ? error.message : "Cập nhật nguồn tiền thất bại";
            return errorResponseWithStatusCode(message, 400);
        }
    }

    static async reorderSourcesOfMoney(data: IReorderSourcesOfMoneyData) {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) {
            return unauthorizedResponse();
        }

        const orderedIds = data.orderedIds ?? [];
        if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
            return errorResponseWithStatusCode("Danh sách thứ tự không hợp lệ", 400);
        }

        const [owned, totalOwned] = await Promise.all([
            SourcesOfMoneyModel.find({
                userId: user.userId,
                _id: { $in: orderedIds },
                ...NOT_ARCHIVED,
            }).select("_id"),
            SourcesOfMoneyModel.countDocuments({ userId: user.userId, ...NOT_ARCHIVED }),
        ]);

        if (owned.length !== orderedIds.length) {
            return errorResponseWithStatusCode(
                "Một số nguồn tiền không tồn tại hoặc không thuộc về bạn",
                400,
            );
        }
        if (orderedIds.length !== totalOwned) {
            return errorResponseWithStatusCode(
                "Cần gửi đầy đủ danh sách nguồn tiền để sắp xếp",
                400,
            );
        }

        await Promise.all(
            orderedIds.map((id, index) =>
                SourcesOfMoneyModel.updateOne(
                    { _id: id, userId: user.userId },
                    { $set: { sortOrder: index } },
                ),
            ),
        );

        return successResponse(null, "Cập nhật thứ tự nguồn tiền thành công");
    }

    static async getBalanceAdjustments(sourceId: string, query: IDefaultQuery) {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) {
            return unauthorizedResponse();
        }

        // Nguồn đã lưu trữ vẫn xem được lịch sử
        const source = await SourcesOfMoneyModel.exists({ _id: sourceId, userId: user.userId });
        if (!source) {
            return errorResponseWithStatusCode("Không tìm thấy nguồn tiền", 404);
        }

        const { page, limit } = normalizePagination(query.page, query.limit, 10);
        const filter = { userId: user.userId, sourceOfMoneyId: sourceId };
        const [items, total] = await Promise.all([
            BalanceAdjustmentsModel.find(filter)
                .sort({ adjustedAt: -1, createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            BalanceAdjustmentsModel.countDocuments(filter),
        ]);

        return successResponsePageNation(items, total, page, limit);
    }

    static async deleteSourcesOfMoney(id: string) {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) {
            return unauthorizedResponse();
        }

        const filter = { _id: id, userId: user.userId, ...NOT_ARCHIVED };

        // Đã có giao dịch thì chỉ lưu trữ để lịch sử vẫn hiển thị tên nguồn tiền
        if (await hasTransactions(user.userId, id)) {
            // Số dư/dư nợ phải về 0 (điều kiện nằm trong filter để tránh race),
            // nếu không tài sản sẽ biến mất khỏi dashboard
            const archived = await SourcesOfMoneyModel.findOneAndUpdate(
                {
                    ...filter,
                    $or: [
                        { type: { $ne: SourcesOfMoneyType.CREDIT_CARD }, balance: 0 },
                        {
                            type: SourcesOfMoneyType.CREDIT_CARD,
                            "creditDetails.currentDebt": { $in: [0, null] },
                        },
                    ],
                },
                { $set: { archivedAt: new Date() } },
            );
            if (archived) {
                return successResponse(null, "Đã xóa nguồn tiền (lịch sử giao dịch vẫn giữ tên)");
            }

            const exists = await SourcesOfMoneyModel.exists(filter);
            if (!exists) {
                return errorResponseWithStatusCode("Không tìm thấy nguồn tiền", 404);
            }
            return errorResponseWithStatusCode(
                "Nguồn tiền còn số dư hoặc dư nợ. Hãy chuyển hết hoặc điều chỉnh về 0 trước khi xóa",
                400,
            );
        }

        const deleted = await SourcesOfMoneyModel.findOneAndDelete(filter);
        if (!deleted) {
            return errorResponseWithStatusCode("Không tìm thấy nguồn tiền", 404);
        }

        return successResponse(null, "Xóa nguồn tiền thành công");
    }
}
