import mongoose from "mongoose";
import dbConnect from "@/server/connectDb";
import TransfersModel from "@/server/models/transfers.model";
import ExpensesModel from "@/server/models/expenses.model";
import CategoriesModel from "@/server/models/categories.model";
import SourcesOfMoneyModel from "@/server/models/sources-of-money.model";
import {
    type IFromTransfersData,
    type IPaginatedTransfersQuery,
} from "@/libs/interfaces/transfersData";
import { SourcesOfMoneyType } from "@/libs/interfaces/sourcesOfMoneyData";
import { CategoryKind } from "@/libs/interfaces/categoriesData";
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
import { calcPercentFee } from "@/libs/utils/cardFee";
import { buildListSummary } from "../utils/listSummary";
import { buildListDateRange } from "../utils/dayRange";
import { parseMoney } from "../utils/money";
import { parseTransactionDate } from "../utils/transactionDate";
import { safeRollback } from "../utils/safeRollback";
import { assertLedgerUnlocked } from "../utils/ledgerLock";
import { recordAgentCreateAudit, recordTransactionAudit } from "../utils/transactionAudit";
import {
    TransactionAuditAction,
    TransactionAuditKind,
} from "@/libs/interfaces/transactionAuditsData";

type SourceDoc = {
    _id: mongoose.Types.ObjectId;
    type: SourcesOfMoneyType;
    balance: number;
    creditDetails?: {
        creditLimit?: number;
        currentDebt?: number;
        cashAdvanceFeeMin?: number;
    };
};

function normalizePayload(data: IFromTransfersData) {
    const fromSourceId = data.fromSourceId?.trim();
    const toSourceId = data.toSourceId?.trim();
    const feePercent = data.feePercent == null ? 0 : Number(data.feePercent);
    const feeCategoryId = data.feeCategoryId?.trim() || "";
    const note = data.note?.trim() || "";

    if (!fromSourceId) throw new Error("Nguồn chuyển là bắt buộc");
    if (!toSourceId) throw new Error("Nguồn nhận là bắt buộc");
    if (fromSourceId === toSourceId) {
        throw new Error("Nguồn chuyển và nguồn nhận phải khác nhau");
    }
    const amount = parseMoney(data.amount, "Số tiền");
    if (!Number.isFinite(feePercent) || feePercent < 0 || feePercent > 100) {
        throw new Error("Phí chuyển đổi phải từ 0 đến 100%");
    }
    const transferredAt = parseTransactionDate(data.transferredAt, "Ngày chuyển");

    const feeAmount = calcPercentFee(amount, feePercent);

    return {
        fromSourceId,
        toSourceId,
        amount,
        feePercent,
        feeAmount,
        feeCategoryId,
        note,
        transferredAt,
    };
}

async function loadOwnedSources(userId: string, fromId: string, toId: string) {
    const [fromSource, toSource] = await Promise.all([
        SourcesOfMoneyModel.findOne({ _id: fromId, userId, ...NOT_ARCHIVED }),
        SourcesOfMoneyModel.findOne({ _id: toId, userId, ...NOT_ARCHIVED }),
    ]);

    if (!fromSource) throw new Error("Không tìm thấy nguồn chuyển");
    if (!toSource) throw new Error("Không tìm thấy nguồn nhận");

    return {
        fromSource: fromSource as SourceDoc,
        toSource: toSource as SourceDoc,
    };
}

/** Trừ tiền / tăng dư nợ thẻ (bên chuyển ra). */
async function debitSource(userId: string, source: SourceDoc, amount: number) {
    if (source.type === SourcesOfMoneyType.CREDIT_CARD) {
        const limit = source.creditDetails?.creditLimit ?? 0;
        const debt = source.creditDetails?.currentDebt ?? 0;
        if (debt + amount > limit + 0.0001) {
            throw new Error("Vượt hạn mức tín dụng còn lại");
        }

        const updated = await SourcesOfMoneyModel.findOneAndUpdate(
            {
                _id: source._id,
                userId,
                type: SourcesOfMoneyType.CREDIT_CARD,
                "creditDetails.currentDebt": { $lte: limit - amount + 0.0001 },
            },
            { $inc: { "creditDetails.currentDebt": amount } },
            { returnDocument: "after" },
        );
        if (!updated) {
            throw new Error("Vượt hạn mức tín dụng còn lại");
        }
        return updated;
    }

    const updated = await SourcesOfMoneyModel.findOneAndUpdate(
        {
            _id: source._id,
            userId,
            type: { $ne: SourcesOfMoneyType.CREDIT_CARD },
            balance: { $gte: amount },
        },
        { $inc: { balance: -amount } },
        { returnDocument: "after" },
    );
    if (!updated) {
        throw new Error("Số dư nguồn tiền không đủ");
    }
    return updated;
}

/** Hoàn lại khi rollback debit. */
async function creditBackDebit(
    userId: string,
    source: SourceDoc,
    amount: number,
) {
    if (source.type === SourcesOfMoneyType.CREDIT_CARD) {
        const updated = await SourcesOfMoneyModel.findOneAndUpdate(
            {
                _id: source._id,
                userId,
                type: SourcesOfMoneyType.CREDIT_CARD,
                "creditDetails.currentDebt": { $gte: amount },
            },
            { $inc: { "creditDetails.currentDebt": -amount } },
            { returnDocument: "after" },
        );
        if (!updated) {
            throw new Error("Hoàn dư nợ thẻ thất bại");
        }
        return updated;
    }

    const updated = await SourcesOfMoneyModel.findOneAndUpdate(
        {
            _id: source._id,
            userId,
            type: { $ne: SourcesOfMoneyType.CREDIT_CARD },
        },
        { $inc: { balance: amount } },
        { returnDocument: "after" },
    );
    if (!updated) {
        throw new Error("Hoàn số dư nguồn chuyển thất bại");
    }
    return updated;
}

/**
 * Cộng tiền vào nguồn nhận / giảm dư nợ thẻ.
 * `receiveAmount` với thẻ = số trả nợ; với nguồn thường = số nhận thực tế.
 */
async function creditSource(
    userId: string,
    source: SourceDoc,
    receiveAmount: number,
) {
    if (source.type === SourcesOfMoneyType.CREDIT_CARD) {
        const debt = source.creditDetails?.currentDebt ?? 0;
        if (receiveAmount > debt + 0.0001) {
            throw new Error("Số tiền chuyển vượt dư nợ thẻ tín dụng");
        }

        const updated = await SourcesOfMoneyModel.findOneAndUpdate(
            {
                _id: source._id,
                userId,
                type: SourcesOfMoneyType.CREDIT_CARD,
                "creditDetails.currentDebt": { $gte: receiveAmount },
            },
            { $inc: { "creditDetails.currentDebt": -receiveAmount } },
            { returnDocument: "after" },
        );
        if (!updated) {
            throw new Error("Số tiền chuyển vượt dư nợ thẻ tín dụng");
        }
        return updated;
    }

    const updated = await SourcesOfMoneyModel.findOneAndUpdate(
        {
            _id: source._id,
            userId,
            type: { $ne: SourcesOfMoneyType.CREDIT_CARD },
        },
        { $inc: { balance: receiveAmount } },
        { returnDocument: "after" },
    );
    if (!updated) {
        throw new Error("Cập nhật số dư nguồn nhận thất bại");
    }
    return updated;
}

/** Hoàn lại khi rollback credit. */
async function debitBackCredit(
    userId: string,
    source: SourceDoc,
    receiveAmount: number,
) {
    if (source.type === SourcesOfMoneyType.CREDIT_CARD) {
        const limit = source.creditDetails?.creditLimit ?? 0;
        const updated = await SourcesOfMoneyModel.findOneAndUpdate(
            {
                _id: source._id,
                userId,
                type: SourcesOfMoneyType.CREDIT_CARD,
                "creditDetails.currentDebt": {
                    $lte: limit - receiveAmount + 0.0001,
                },
            },
            { $inc: { "creditDetails.currentDebt": receiveAmount } },
            { returnDocument: "after" },
        );
        if (!updated) {
            throw new Error("Hoàn dư nợ thẻ nhận thất bại");
        }
        return updated;
    }

    const updated = await SourcesOfMoneyModel.findOneAndUpdate(
        {
            _id: source._id,
            userId,
            type: { $ne: SourcesOfMoneyType.CREDIT_CARD },
            balance: { $gte: receiveAmount },
        },
        { $inc: { balance: -receiveAmount } },
        { returnDocument: "after" },
    );
    if (!updated) {
        throw new Error("Hoàn số dư nguồn nhận thất bại");
    }
    return updated;
}

function validateTransferRules(
    fromSource: SourceDoc,
    toSource: SourceDoc,
    amount: number,
    feePercent: number,
    feeAmount: number,
    feeCategoryId: string,
) {
    const fromIsCC = fromSource.type === SourcesOfMoneyType.CREDIT_CARD;
    const toIsCC = toSource.type === SourcesOfMoneyType.CREDIT_CARD;

    if (fromIsCC && toIsCC) {
        throw new Error("Không hỗ trợ chuyển giữa hai thẻ tín dụng");
    }

    if (toIsCC) {
        if (feePercent > 0 || feeAmount > 0) {
            throw new Error("Chuyển vào thẻ tín dụng không áp dụng phí");
        }
        const debt = toSource.creditDetails?.currentDebt ?? 0;
        if (amount > debt + 0.0001) {
            throw new Error(
                `Số tiền tối đa bằng dư nợ đang nợ (${debt.toLocaleString("vi-VN")})`,
            );
        }
        return { receiveAmount: amount };
    }

    if (fromIsCC) {
        if (feeAmount >= amount) {
            throw new Error(
                `Phí chuyển đổi (${feeAmount.toLocaleString("vi-VN")}) phải nhỏ hơn số tiền chuyển`,
            );
        }
        if (feeAmount > 0 && !feeCategoryId) {
            throw new Error("Danh mục chi tiêu phí là bắt buộc khi có phí");
        }
        const limit = fromSource.creditDetails?.creditLimit ?? 0;
        const debt = fromSource.creditDetails?.currentDebt ?? 0;
        const available = Math.max(0, limit - debt);
        if (amount > available + 0.0001) {
            throw new Error(
                `Vượt hạn mức còn lại (${available.toLocaleString("vi-VN")})`,
            );
        }
        return { receiveAmount: amount - feeAmount };
    }

    if (feePercent > 0 || feeAmount > 0) {
        throw new Error("Chỉ áp dụng phí khi chuyển từ thẻ tín dụng");
    }
    if ((fromSource.balance ?? 0) < amount) {
        throw new Error("Số dư nguồn tiền không đủ");
    }
    return { receiveAmount: amount };
}

async function getPopulatedTransfer(id: string, userId: string) {
    return TransfersModel.findOne({ _id: id, userId })
        .populate("fromSourceId", "name type balance creditDetails archivedAt")
        .populate("toSourceId", "name type balance creditDetails archivedAt")
        .populate("feeCategoryId", "name archivedAt")
        .lean();
}

/**
 * Lõi tạo chuyển tiền (dùng chung với đáo hạn có tự trả một phần): throw Error khi không hợp lệ,
 * trả về transfer đã populate. Thứ tự ghi và rollback giữ nguyên như mô tả ở balance-rules.md.
 */
export async function createTransferRecord(userId: string, data: IFromTransfersData) {
        const payload = normalizePayload(data);
        await assertLedgerUnlocked(userId, payload.transferredAt);
        const { fromSource, toSource } = await loadOwnedSources(
            userId,
            payload.fromSourceId,
            payload.toSourceId,
        );

        // Phí rút tiền mặt tối thiểu của thẻ áp dụng cho mọi lần chuyển có phí từ thẻ
        const cashAdvanceFeeMin = fromSource.creditDetails?.cashAdvanceFeeMin;
        if (
            payload.feePercent > 0 &&
            fromSource.type === SourcesOfMoneyType.CREDIT_CARD &&
            cashAdvanceFeeMin
        ) {
            payload.feeAmount = calcPercentFee(
                payload.amount,
                payload.feePercent,
                cashAdvanceFeeMin,
            );
        }

        const { receiveAmount } = validateTransferRules(
            fromSource,
            toSource,
            payload.amount,
            payload.feePercent,
            payload.feeAmount,
            payload.feeCategoryId,
        );

        if (payload.feeAmount > 0) {
            const category = await CategoriesModel.findOne({
                _id: payload.feeCategoryId,
                userId: userId,
                ...NOT_ARCHIVED,
            }).select("_id kind");
            if (!category) {
                throw new Error("Không tìm thấy danh mục phí");
            }
            if (category.kind && category.kind !== CategoryKind.EXPENSE) {
                throw new Error("Danh mục phí phải là danh mục chi tiêu");
            }
        }

        await debitSource(userId, fromSource, payload.amount);

        const context = { userId, operation: "transfer.create" };
        try {
            await creditSource(userId, toSource, receiveAmount);
        } catch (creditError) {
            await safeRollback(
                {
                    ...context,
                    sourceOfMoneyId: fromSource._id,
                    step: "credit-back-from",
                    amount: payload.amount,
                    originalError: creditError,
                },
                () => creditBackDebit(userId, fromSource, payload.amount),
            );
            throw creditError;
        }

        let feeExpenseId: mongoose.Types.ObjectId | undefined;

        try {
            if (payload.feeAmount > 0) {
                const feeExpense = await ExpensesModel.create({
                    userId: userId,
                    categoryId: new mongoose.Types.ObjectId(
                        payload.feeCategoryId,
                    ),
                    sourceOfMoneyId: fromSource._id,
                    amount: payload.feeAmount,
                    note:
                        payload.note ||
                        `Phí chuyển đổi ${payload.feePercent}%`,
                    spentAt: payload.transferredAt,
                    skipBalanceAdjust: true,
                });
                feeExpenseId = feeExpense._id as mongoose.Types.ObjectId;
            }

            const created = await TransfersModel.create({
                userId: userId,
                fromSourceId: new mongoose.Types.ObjectId(
                    payload.fromSourceId,
                ),
                toSourceId: new mongoose.Types.ObjectId(payload.toSourceId),
                amount: payload.amount,
                feePercent: payload.feePercent,
                feeAmount: payload.feeAmount,
                feeCategoryId: payload.feeCategoryId
                    ? new mongoose.Types.ObjectId(payload.feeCategoryId)
                    : undefined,
                feeExpenseId,
                note: payload.note,
                transferredAt: payload.transferredAt,
            });

            return getPopulatedTransfer(created._id.toString(), userId);
        } catch (createError) {
            if (feeExpenseId) {
                await safeRollback(
                    { ...context, step: "delete-fee-expense", originalError: createError },
                    () => ExpensesModel.findOneAndDelete({ _id: feeExpenseId, userId: userId }),
                );
            }
            await safeRollback(
                {
                    ...context,
                    sourceOfMoneyId: toSource._id,
                    step: "debit-back-to",
                    amount: receiveAmount,
                    originalError: createError,
                },
                () => debitBackCredit(userId, toSource, receiveAmount),
            );
            await safeRollback(
                {
                    ...context,
                    sourceOfMoneyId: fromSource._id,
                    step: "credit-back-from",
                    amount: payload.amount,
                    originalError: createError,
                },
                () => creditBackDebit(userId, fromSource, payload.amount),
            );
            throw createError;
        }
}

/**
 * Lõi xóa chuyển tiền (hoàn số dư hai bên, xóa fee expense): throw Error khi không xóa được.
 * Trả về document đã xóa để nơi gọi ghi lịch sử (không ghi ở đây vì hàm này cũng dùng để rollback).
 */
export async function deleteTransferRecord(userId: string, id: string) {
        const existing = await TransfersModel.findOne({
            _id: id,
            userId: userId,
        });
        if (!existing) {
            throw new Error("Không tìm thấy giao dịch chuyển tiền");
        }
        await assertLedgerUnlocked(userId, existing.transferredAt);

        // A side whose source was deleted or archived has nothing left to reverse.
        const [fromSource, toSource] = (await Promise.all([
            SourcesOfMoneyModel.findOne({
                _id: existing.fromSourceId,
                userId: userId,
                ...NOT_ARCHIVED,
            }),
            SourcesOfMoneyModel.findOne({
                _id: existing.toSourceId,
                userId: userId,
                ...NOT_ARCHIVED,
            }),
        ])) as [SourceDoc | null, SourceDoc | null];

        const receiveAmount = existing.amount - (existing.feeAmount || 0);

        // Reverse: take back from destination, restore from source
        if (toSource) {
            await debitBackCredit(userId, toSource, receiveAmount);
        }

        const context = { userId, operation: "transfer.delete" };
        try {
            if (fromSource) {
                await creditBackDebit(userId, fromSource, existing.amount);
            }
        } catch (restoreError) {
            if (toSource) {
                await safeRollback(
                    {
                        ...context,
                        sourceOfMoneyId: toSource._id,
                        step: "recredit-to",
                        amount: receiveAmount,
                        originalError: restoreError,
                    },
                    () => creditSource(userId, toSource, receiveAmount),
                );
            }
            throw restoreError;
        }

        try {
            if (existing.feeExpenseId) {
                // Fee expense never adjusted balances — delete document only
                await ExpensesModel.findOneAndDelete({
                    _id: existing.feeExpenseId,
                    userId: userId,
                });
            }

            await TransfersModel.findOneAndDelete({
                _id: id,
                userId: userId,
            });
        } catch (deleteError) {
            if (fromSource) {
                await safeRollback(
                    {
                        ...context,
                        sourceOfMoneyId: fromSource._id,
                        step: "redebit-from",
                        amount: existing.amount,
                        originalError: deleteError,
                    },
                    () => debitSource(userId, fromSource, existing.amount),
                );
            }
            if (toSource) {
                await safeRollback(
                    {
                        ...context,
                        sourceOfMoneyId: toSource._id,
                        step: "recredit-to",
                        amount: receiveAmount,
                        originalError: deleteError,
                    },
                    () => creditSource(userId, toSource, receiveAmount),
                );
            }
            throw deleteError;
        }

        return existing;
}

export class TransfersService {
    static async getTransfers(query: IPaginatedTransfersQuery) {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) return unauthorizedResponse();

        const {
            page: rawPage,
            limit: rawLimit,
            search = "",
            fromSourceId,
            toSourceId,
            from,
            to,
        } = query;
        const { page, limit } = normalizePagination(rawPage, rawLimit, 10);

        const filter: Record<string, unknown> = { userId: user.userId };

        if (search) {
            filter.note = { $regex: escapeRegex(search), $options: "i" };
        }
        if (fromSourceId) filter.fromSourceId = fromSourceId;
        if (toSourceId) filter.toSourceId = toSourceId;

        const transferredAt = buildListDateRange(from, to);
        if (transferredAt) filter.transferredAt = transferredAt;

        const [items, total] = await Promise.all([
            TransfersModel.find(filter)
                .populate("fromSourceId", "name type balance creditDetails archivedAt")
                .populate("toSourceId", "name type balance creditDetails archivedAt")
                .populate("feeCategoryId", "name archivedAt")
                .skip((page - 1) * limit)
                .limit(limit)
                .sort({ transferredAt: -1, createdAt: -1 })
                .lean(),
            TransfersModel.countDocuments(filter),
        ]);
        const { summary, dayTotals, breakdown } = await buildListSummary(TransfersModel, filter, items, {
            dateField: "transferredAt", feeField: "feeAmount",
            breakdown: { field: "toSourceId", from: SourcesOfMoneyModel.collection.name },
        });

        return successResponsePageNation(items, total, page, limit, "", {
            summary,
            dayTotals,
            breakdown,
        });
    }

    static async createTransfer(data: IFromTransfersData) {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) return unauthorizedResponse();

        try {
            const populated = await createTransferRecord(user.userId, data);
            await recordAgentCreateAudit({
                userId: user.userId,
                kind: TransactionAuditKind.TRANSFER,
                created: populated,
            });
            return successResponse(populated, "Chuyển tiền thành công");
        } catch (error: unknown) {
            const message =
                error instanceof Error ? error.message : "Chuyển tiền thất bại";
            return errorResponseWithStatusCode(message, 400);
        }
    }

    static async deleteTransfer(id: string) {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) return unauthorizedResponse();

        try {
            const deleted = await deleteTransferRecord(user.userId, id);
            await recordTransactionAudit({
                userId: user.userId,
                kind: TransactionAuditKind.TRANSFER,
                refId: id,
                action: TransactionAuditAction.DELETE,
                before: deleted,
            });
            return successResponse(null, "Xóa giao dịch chuyển tiền thành công");
        } catch (error: unknown) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Xóa giao dịch chuyển tiền thất bại";
            const status = message === "Không tìm thấy giao dịch chuyển tiền" ? 404 : 400;
            return errorResponseWithStatusCode(message, status);
        }
    }
}
