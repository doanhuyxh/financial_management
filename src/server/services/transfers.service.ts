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
import {
    errorResponseWithStatusCode,
    successResponse,
    successResponsePageNation,
    unauthorizedResponse,
} from "../utils/responseServer";
import { getCurrentUser } from "../utils/getCurrentUser";
import { escapeRegex } from "../utils/escapeRegex";

type SourceDoc = {
    _id: mongoose.Types.ObjectId;
    type: SourcesOfMoneyType;
    balance: number;
    creditDetails?: {
        creditLimit?: number;
        currentDebt?: number;
    };
};

function normalizePayload(data: IFromTransfersData) {
    const fromSourceId = data.fromSourceId?.trim();
    const toSourceId = data.toSourceId?.trim();
    const amount = Number(data.amount);
    const feePercent = data.feePercent == null ? 0 : Number(data.feePercent);
    const feeCategoryId = data.feeCategoryId?.trim() || "";
    const note = data.note?.trim() || "";
    const transferredAt = data.transferredAt
        ? new Date(data.transferredAt)
        : new Date();

    if (!fromSourceId) throw new Error("Nguồn chuyển là bắt buộc");
    if (!toSourceId) throw new Error("Nguồn nhận là bắt buộc");
    if (fromSourceId === toSourceId) {
        throw new Error("Nguồn chuyển và nguồn nhận phải khác nhau");
    }
    if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Số tiền phải lớn hơn 0");
    }
    if (!Number.isFinite(feePercent) || feePercent < 0) {
        throw new Error("Phí chuyển đổi không hợp lệ");
    }
    if (Number.isNaN(transferredAt.getTime())) {
        throw new Error("Ngày chuyển không hợp lệ");
    }

    const feeAmount =
        feePercent > 0 ? Math.round((amount * feePercent) / 100) : 0;

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
        SourcesOfMoneyModel.findOne({ _id: fromId, userId }),
        SourcesOfMoneyModel.findOne({ _id: toId, userId }),
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
            throw new Error("Phí chuyển đổi phải nhỏ hơn số tiền chuyển");
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
        .populate("fromSourceId", "name type balance creditDetails")
        .populate("toSourceId", "name type balance creditDetails")
        .populate("feeCategoryId", "name")
        .lean();
}

export class TransfersService {
    static async getTransfers(query: IPaginatedTransfersQuery) {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) return unauthorizedResponse();

        const {
            page = 1,
            limit = 10,
            search = "",
            fromSourceId,
            toSourceId,
            from,
            to,
        } = query;

        const filter: Record<string, unknown> = { userId: user.userId };

        if (search) {
            filter.note = { $regex: escapeRegex(search), $options: "i" };
        }
        if (fromSourceId) filter.fromSourceId = fromSourceId;
        if (toSourceId) filter.toSourceId = toSourceId;

        if (from || to) {
            const transferredAt: Record<string, Date> = {};
            if (from) transferredAt.$gte = new Date(from);
            if (to) {
                const end = new Date(to);
                end.setHours(23, 59, 59, 999);
                transferredAt.$lte = end;
            }
            filter.transferredAt = transferredAt;
        }

        const [items, total] = await Promise.all([
            TransfersModel.find(filter)
                .populate("fromSourceId", "name type balance creditDetails")
                .populate("toSourceId", "name type balance creditDetails")
                .populate("feeCategoryId", "name")
                .skip((page - 1) * limit)
                .limit(limit)
                .sort({ transferredAt: -1, createdAt: -1 })
                .lean(),
            TransfersModel.countDocuments(filter),
        ]);

        return successResponsePageNation(items, total, page, limit);
    }

    static async createTransfer(data: IFromTransfersData) {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) return unauthorizedResponse();

        try {
            const payload = normalizePayload(data);
            const { fromSource, toSource } = await loadOwnedSources(
                user.userId,
                payload.fromSourceId,
                payload.toSourceId,
            );

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
                    userId: user.userId,
                }).select("_id");
                if (!category) {
                    throw new Error("Không tìm thấy danh mục phí");
                }
            }

            await debitSource(user.userId, fromSource, payload.amount);

            try {
                await creditSource(user.userId, toSource, receiveAmount);
            } catch (creditError) {
                await creditBackDebit(user.userId, fromSource, payload.amount);
                throw creditError;
            }

            let feeExpenseId: mongoose.Types.ObjectId | undefined;

            try {
                if (payload.feeAmount > 0) {
                    const feeExpense = await ExpensesModel.create({
                        userId: user.userId,
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
                    userId: user.userId,
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

                const populated = await getPopulatedTransfer(
                    created._id.toString(),
                    user.userId,
                );
                return successResponse(populated, "Chuyển tiền thành công");
            } catch (createError) {
                if (feeExpenseId) {
                    await ExpensesModel.findOneAndDelete({
                        _id: feeExpenseId,
                        userId: user.userId,
                    });
                }
                await debitBackCredit(user.userId, toSource, receiveAmount);
                await creditBackDebit(user.userId, fromSource, payload.amount);
                throw createError;
            }
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
            const existing = await TransfersModel.findOne({
                _id: id,
                userId: user.userId,
            });
            if (!existing) {
                return errorResponseWithStatusCode(
                    "Không tìm thấy giao dịch chuyển tiền",
                    404,
                );
            }

            const { fromSource, toSource } = await loadOwnedSources(
                user.userId,
                existing.fromSourceId.toString(),
                existing.toSourceId.toString(),
            );

            const receiveAmount = existing.amount - (existing.feeAmount || 0);

            // Reverse: take back from destination, restore from source
            await debitBackCredit(user.userId, toSource, receiveAmount);

            try {
                await creditBackDebit(user.userId, fromSource, existing.amount);
            } catch (restoreError) {
                await creditSource(user.userId, toSource, receiveAmount);
                throw restoreError;
            }

            try {
                if (existing.feeExpenseId) {
                    // Fee expense never adjusted balances — delete document only
                    await ExpensesModel.findOneAndDelete({
                        _id: existing.feeExpenseId,
                        userId: user.userId,
                    });
                }

                await TransfersModel.findOneAndDelete({
                    _id: id,
                    userId: user.userId,
                });
            } catch (deleteError) {
                await debitSource(user.userId, fromSource, existing.amount);
                await creditSource(user.userId, toSource, receiveAmount);
                throw deleteError;
            }

            return successResponse(null, "Xóa giao dịch chuyển tiền thành công");
        } catch (error: unknown) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Xóa giao dịch chuyển tiền thất bại";
            return errorResponseWithStatusCode(message, 400);
        }
    }
}
