import mongoose from "mongoose";
import dbConnect from "@/server/connectDb";
import ExpensesModel from "@/server/models/expenses.model";
import CategoriesModel from "@/server/models/categories.model";
import SourcesOfMoneyModel from "@/server/models/sources-of-money.model";
import {
    CardFeeType,
    type IFromExpensesData,
    type IPaginatedExpensesQuery,
} from "@/libs/interfaces/expensesData";
import {
    FOREIGN_FEE_TYPE_LABELS,
    ForeignFeeType,
    SourcesOfMoneyType,
} from "@/libs/interfaces/sourcesOfMoneyData";
import { calcPercentFee, getForeignFeeConfig } from "@/libs/utils/cardFee";
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
import { buildListSummary } from "../utils/listSummary";
import { buildListDateRange } from "../utils/dayRange";
import { parseMoney } from "../utils/money";
import { parseTransactionDate } from "../utils/transactionDate";
import { safeRollback } from "../utils/safeRollback";
import { assertLedgerUnlocked } from "../utils/ledgerLock";
import { recordTransactionAudit } from "../utils/transactionAudit";
import {
    TransactionAuditAction,
    TransactionAuditKind,
} from "@/libs/interfaces/transactionAuditsData";

function normalizePayload(data: IFromExpensesData) {
    const categoryId = data.categoryId?.trim();
    const sourceOfMoneyId = data.sourceOfMoneyId?.trim();
    const note = data.note?.trim() || "";

    if (!categoryId) throw new Error("Danh mục là bắt buộc");
    if (!sourceOfMoneyId) throw new Error("Nguồn tiền là bắt buộc");
    const amount = parseMoney(data.amount, "Số tiền");
    const spentAt = parseTransactionDate(data.spentAt, "Ngày chi");

    const cardFeeType = data.cardFeeType || undefined;
    if (cardFeeType && !Object.values(CardFeeType).includes(cardFeeType)) {
        throw new Error("Loại phí thẻ không hợp lệ");
    }
    // Phí đáo hạn chỉ sinh từ bản ghi đáo hạn (card-rollovers.service) để dư nợ và lịch sử khớp nhau
    if (cardFeeType === CardFeeType.ROLLOVER_FEE) {
        throw new Error("Phí đáo hạn chỉ ghi được qua nút Đáo hạn của thẻ trên Tổng quan");
    }

    return { categoryId, sourceOfMoneyId, amount, note, spentAt, cardFeeType };
}

/**
 * Phí giao dịch quốc tế (chỉ khi tạo): tính theo cấu hình của thẻ, max(% × số tiền, tối thiểu).
 * Trả null khi không chọn.
 */
function getForeignFee(
    data: IFromExpensesData,
    source: { type: SourcesOfMoneyType; creditDetails?: Parameters<typeof getForeignFeeConfig>[0] },
    amount: number,
    cardFeeType: CardFeeType | undefined,
) {
    const type = data.foreignFeeType || undefined;
    if (!type) return null;
    if (!Object.values(ForeignFeeType).includes(type)) {
        throw new Error("Loại giao dịch quốc tế không hợp lệ");
    }
    if (cardFeeType) throw new Error("Khoản phí thẻ không thể kèm phí giao dịch quốc tế");
    if (source.type !== SourcesOfMoneyType.CREDIT_CARD) {
        throw new Error("Phí giao dịch quốc tế chỉ áp dụng cho thẻ tín dụng");
    }
    const config = getForeignFeeConfig(source.creditDetails, type);
    if (!config) {
        throw new Error(`Thẻ chưa cấu hình phí ${FOREIGN_FEE_TYPE_LABELS[type].toLowerCase()}`);
    }
    const feeAmount = calcPercentFee(amount, config.percent, config.min);
    if (feeAmount <= 0) return null;
    const rate = config.percent ? ` ${config.percent}%` : "";
    return { feeAmount, label: `Phí ${FOREIGN_FEE_TYPE_LABELS[type].toLowerCase()}${rate}` };
}

/**
 * `current`: danh mục/nguồn đang gắn với bản ghi khi sửa. Giữ nguyên thì được phép dù
 * đã lưu trữ hoặc khác loại (dữ liệu cũ); chọn mới thì phải đang dùng và đúng loại.
 * `sourceActive = false` nghĩa là nguồn đã lưu trữ — không điều chỉnh số dư của nó.
 */
async function assertOwnedRefs(
    userId: string,
    categoryId: string,
    sourceOfMoneyId: string,
    current?: { categoryId: string; sourceOfMoneyId: string },
) {
    const [category, source] = await Promise.all([
        CategoriesModel.findOne({ _id: categoryId, userId }).select("_id name kind archivedAt"),
        SourcesOfMoneyModel.findOne({ _id: sourceOfMoneyId, userId }),
    ]);

    if (!category) throw new Error("Không tìm thấy danh mục");
    if (!source) throw new Error("Không tìm thấy nguồn tiền");

    if (categoryId !== current?.categoryId) {
        if (category.archivedAt) throw new Error("Danh mục đã bị xóa");
        if (category.kind && category.kind !== CategoryKind.EXPENSE) {
            throw new Error("Danh mục này dành cho thu nhập, hãy chọn danh mục chi tiêu");
        }
    }
    if (sourceOfMoneyId !== current?.sourceOfMoneyId && source.archivedAt) {
        throw new Error("Nguồn tiền đã bị xóa");
    }

    return { category, source, sourceActive: !source.archivedAt };
}

/**
 * Sửa số tiền trên cùng một nguồn: một lần `$inc` theo chênh lệch thay vì hoàn cũ rồi trừ mới,
 * để không chặn nhầm (VD còn 50k, sửa 100k → 90k vẫn được) và không có khoảng hở giữa hai bước.
 * `delta > 0` là chi thêm, `< 0` là hoàn bớt.
 */
async function adjustSourceBalanceByDelta(userId: string, sourceId: string, delta: number) {
    if (delta === 0) return null;
    return delta > 0
        ? adjustSourceBalance(userId, sourceId, delta, "apply")
        : adjustSourceBalance(userId, sourceId, -delta, "revert");
}

/** Apply: trừ tiền / tăng dư nợ. Revert: hoàn tiền / giảm dư nợ. */
async function adjustSourceBalance(
    userId: string,
    sourceId: string,
    amount: number,
    direction: "apply" | "revert",
) {
    const source = await SourcesOfMoneyModel.findOne({ _id: sourceId, userId });
    if (!source) {
        throw new Error("Không tìm thấy nguồn tiền");
    }

    if (source.type === SourcesOfMoneyType.CREDIT_CARD) {
        const limit = source.creditDetails?.creditLimit ?? 0;
        const debt = source.creditDetails?.currentDebt ?? 0;
        const debtDelta = direction === "apply" ? amount : -amount;
        const nextDebt = debt + debtDelta;

        if (nextDebt < -0.0001) {
            throw new Error("Không thể hoàn dư nợ dưới 0");
        }
        if (direction === "apply" && nextDebt > limit + 0.0001) {
            throw new Error("Vượt hạn mức tín dụng còn lại");
        }

        const updated = await SourcesOfMoneyModel.findOneAndUpdate(
            {
                _id: sourceId,
                userId,
                type: SourcesOfMoneyType.CREDIT_CARD,
                "creditDetails.currentDebt":
                    direction === "apply"
                        ? { $lte: limit - amount + 0.0001 }
                        : { $gte: amount - 0.0001 },
            },
            { $inc: { "creditDetails.currentDebt": debtDelta } },
            { returnDocument: "after" },
        );
        if (!updated) {
            throw new Error(
                direction === "apply"
                    ? "Vượt hạn mức tín dụng còn lại"
                    : "Không thể hoàn dư nợ dưới 0",
            );
        }
        return updated;
    }

    const balanceDelta = direction === "apply" ? -amount : amount;
    const filter: Record<string, unknown> = {
        _id: sourceId,
        userId,
        type: { $ne: SourcesOfMoneyType.CREDIT_CARD },
    };
    if (direction === "apply") {
        filter.balance = { $gte: amount };
    }

    const updated = await SourcesOfMoneyModel.findOneAndUpdate(
        filter,
        { $inc: { balance: balanceDelta } },
        { returnDocument: "after" },
    );

    if (!updated) {
        throw new Error(
            direction === "apply"
                ? "Số dư nguồn tiền không đủ"
                : "Hoàn tiền vào nguồn thất bại",
        );
    }
    return updated;
}

const FEE_EXPENSE_LOCKED_MESSAGE =
    "Đây là phí chuyển tiền, chỉ thay đổi được bằng cách xóa giao dịch chuyển tiền gốc";

async function getPopulatedExpense(id: string, userId: string) {
    return ExpensesModel.findOne({ _id: id, userId })
        .populate("categoryId", "name icon color archivedAt")
        .populate("sourceOfMoneyId", "name type balance creditDetails archivedAt")
        .lean();
}

export class ExpensesService {
    static async getExpenses(query: IPaginatedExpensesQuery) {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) return unauthorizedResponse();

        const {
            page: rawPage,
            limit: rawLimit,
            search = "",
            categoryId,
            sourceOfMoneyId,
            from,
            to,
        } = query;
        const { page, limit } = normalizePagination(rawPage, rawLimit, 10);

        const filter: Record<string, unknown> = { userId: user.userId };

        if (search) {
            filter.note = { $regex: escapeRegex(search), $options: "i" };
        }
        if (categoryId) filter.categoryId = categoryId;
        if (sourceOfMoneyId) filter.sourceOfMoneyId = sourceOfMoneyId;

        const spentAt = buildListDateRange(from, to);
        if (spentAt) filter.spentAt = spentAt;

        const [items, total] = await Promise.all([
            ExpensesModel.find(filter)
                .populate("categoryId", "name icon color archivedAt")
                .populate("sourceOfMoneyId", "name type balance creditDetails archivedAt")
                .skip((page - 1) * limit)
                .limit(limit)
                .sort({ spentAt: -1, createdAt: -1 })
                .lean(),
            ExpensesModel.countDocuments(filter),
        ]);
        const { summary, dayTotals, breakdown } = await buildListSummary(ExpensesModel, filter, items, {
            dateField: "spentAt",
            breakdown: { field: "categoryId", from: CategoriesModel.collection.name },
        });

        return successResponsePageNation(items, total, page, limit, "", {
            summary,
            dayTotals,
            breakdown,
        });
    }

    static async createExpense(data: IFromExpensesData) {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) return unauthorizedResponse();

        try {
            const payload = normalizePayload(data);
            await assertLedgerUnlocked(user.userId, payload.spentAt);
            const { source } = await assertOwnedRefs(
                user.userId,
                payload.categoryId,
                payload.sourceOfMoneyId,
            );
            if (payload.cardFeeType && source.type !== SourcesOfMoneyType.CREDIT_CARD) {
                throw new Error("Phí thẻ chỉ ghi được trên thẻ tín dụng");
            }
            const foreignFee = getForeignFee(data, source, payload.amount, payload.cardFeeType);
            // Trừ một lần cho cả khoản chi và phí để kiểm tra hạn mức cùng lúc
            const totalAmount = payload.amount + (foreignFee?.feeAmount ?? 0);

            await adjustSourceBalance(
                user.userId,
                payload.sourceOfMoneyId,
                totalAmount,
                "apply",
            );

            let createdId: mongoose.Types.ObjectId | undefined;
            try {
                const created = await ExpensesModel.create({
                    ...payload,
                    userId: user.userId,
                    categoryId: new mongoose.Types.ObjectId(payload.categoryId),
                    sourceOfMoneyId: new mongoose.Types.ObjectId(
                        payload.sourceOfMoneyId,
                    ),
                });
                createdId = created._id as mongoose.Types.ObjectId;

                if (foreignFee) {
                    await ExpensesModel.create({
                        userId: user.userId,
                        categoryId: created.categoryId,
                        sourceOfMoneyId: created.sourceOfMoneyId,
                        amount: foreignFee.feeAmount,
                        note: payload.note
                            ? `${foreignFee.label} - ${payload.note}`
                            : foreignFee.label,
                        spentAt: payload.spentAt,
                        cardFeeType: CardFeeType.FOREIGN_FEE,
                    });
                }

                const populated = await getPopulatedExpense(
                    created._id.toString(),
                    user.userId,
                );
                return successResponse(populated, "Tạo chi tiêu thành công");
            } catch (createError) {
                const context = {
                    userId: user.userId,
                    sourceOfMoneyId: payload.sourceOfMoneyId,
                    operation: "expense.create",
                    originalError: createError,
                };
                if (createdId) {
                    await safeRollback({ ...context, step: "delete-expense" }, () =>
                        ExpensesModel.findOneAndDelete({ _id: createdId, userId: user.userId }),
                    );
                }
                await safeRollback({ ...context, step: "revert-balance", amount: totalAmount }, () =>
                    adjustSourceBalance(user.userId, payload.sourceOfMoneyId, totalAmount, "revert"),
                );
                throw createError;
            }
        } catch (error: unknown) {
            const message =
                error instanceof Error ? error.message : "Tạo chi tiêu thất bại";
            return errorResponseWithStatusCode(message, 400);
        }
    }

    static async updateExpense(id: string, data: IFromExpensesData) {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) return unauthorizedResponse();

        try {
            const existing = await ExpensesModel.findOne({
                _id: id,
                userId: user.userId,
            });
            if (!existing) {
                return errorResponseWithStatusCode("Không tìm thấy chi tiêu", 404);
            }
            if (existing.skipBalanceAdjust) {
                return errorResponseWithStatusCode(FEE_EXPENSE_LOCKED_MESSAGE, 400);
            }

            const payload = normalizePayload(data);
            await assertLedgerUnlocked(user.userId, existing.spentAt, payload.spentAt);
            const oldSourceId = existing.sourceOfMoneyId.toString();
            const oldAmount = existing.amount;
            const { source: newSource, sourceActive: newSourceActive } = await assertOwnedRefs(
                user.userId,
                payload.categoryId,
                payload.sourceOfMoneyId,
                { categoryId: existing.categoryId.toString(), sourceOfMoneyId: oldSourceId },
            );
            // Nguồn đã xóa hoặc lưu trữ: bỏ qua phía đó, không hoàn số dư
            const oldSourceExists = Boolean(
                await SourcesOfMoneyModel.exists({
                    _id: oldSourceId,
                    userId: user.userId,
                    ...NOT_ARCHIVED,
                }),
            );

            const context = { userId: user.userId, operation: "expense.update" };
            // Cùng nguồn còn hoạt động: một bước theo chênh lệch. Đổi nguồn: hoàn cũ rồi trừ mới.
            const sameSource = oldSourceId === payload.sourceOfMoneyId && oldSourceExists;
            const amountDelta = payload.amount - oldAmount;

            if (sameSource) {
                await adjustSourceBalanceByDelta(user.userId, oldSourceId, amountDelta);
            } else {
                if (oldSourceExists) {
                    await adjustSourceBalance(user.userId, oldSourceId, oldAmount, "revert");
                }

                try {
                    if (newSourceActive) {
                        await adjustSourceBalance(
                            user.userId,
                            payload.sourceOfMoneyId,
                            payload.amount,
                            "apply",
                        );
                    }
                } catch (applyError) {
                    if (oldSourceExists) {
                        await safeRollback(
                            {
                                ...context,
                                sourceOfMoneyId: oldSourceId,
                                step: "reapply-old-source",
                                amount: oldAmount,
                                originalError: applyError,
                            },
                            () => adjustSourceBalance(user.userId, oldSourceId, oldAmount, "apply"),
                        );
                    }
                    throw applyError;
                }
            }

            try {
                const $set = {
                    categoryId: new mongoose.Types.ObjectId(payload.categoryId),
                    sourceOfMoneyId: new mongoose.Types.ObjectId(payload.sourceOfMoneyId),
                    amount: payload.amount,
                    note: payload.note,
                    spentAt: payload.spentAt,
                };
                // Giữ đánh dấu phí thẻ khi sửa; chuyển sang nguồn không phải thẻ thì bỏ
                const dropCardFee =
                    existing.cardFeeType && newSource.type !== SourcesOfMoneyType.CREDIT_CARD;
                const updated = await ExpensesModel.findOneAndUpdate(
                    { _id: id, userId: user.userId },
                    dropCardFee ? { $set, $unset: { cardFeeType: 1 } } : { $set },
                    { returnDocument: "after" },
                );

                if (!updated) {
                    throw new Error("Cập nhật chi tiêu thất bại");
                }
                await recordTransactionAudit({
                    userId: user.userId,
                    kind: TransactionAuditKind.EXPENSE,
                    refId: id,
                    action: TransactionAuditAction.UPDATE,
                    before: existing,
                    after: updated,
                });

                const populated = await getPopulatedExpense(id, user.userId);
                return successResponse(populated, "Cập nhật chi tiêu thành công");
            } catch (updateError) {
                // Roll back to previous balances
                if (sameSource) {
                    await safeRollback(
                        {
                            ...context,
                            sourceOfMoneyId: oldSourceId,
                            step: "revert-delta",
                            amount: amountDelta,
                            originalError: updateError,
                        },
                        () => adjustSourceBalanceByDelta(user.userId, oldSourceId, -amountDelta),
                    );
                    throw updateError;
                }
                if (newSourceActive) {
                    await safeRollback(
                        {
                            ...context,
                            sourceOfMoneyId: payload.sourceOfMoneyId,
                            step: "revert-new-source",
                            amount: payload.amount,
                            originalError: updateError,
                        },
                        () =>
                            adjustSourceBalance(
                                user.userId,
                                payload.sourceOfMoneyId,
                                payload.amount,
                                "revert",
                            ),
                    );
                }
                if (oldSourceExists) {
                    await safeRollback(
                        {
                            ...context,
                            sourceOfMoneyId: oldSourceId,
                            step: "reapply-old-source",
                            amount: oldAmount,
                            originalError: updateError,
                        },
                        () => adjustSourceBalance(user.userId, oldSourceId, oldAmount, "apply"),
                    );
                }
                throw updateError;
            }
        } catch (error: unknown) {
            const message =
                error instanceof Error ? error.message : "Cập nhật chi tiêu thất bại";
            return errorResponseWithStatusCode(message, 400);
        }
    }

    static async deleteExpense(id: string) {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) return unauthorizedResponse();

        try {
            const existing = await ExpensesModel.findOne({
                _id: id,
                userId: user.userId,
            });
            if (!existing) {
                return errorResponseWithStatusCode("Không tìm thấy chi tiêu", 404);
            }
            if (existing.skipBalanceAdjust) {
                return errorResponseWithStatusCode(FEE_EXPENSE_LOCKED_MESSAGE, 400);
            }
            await assertLedgerUnlocked(user.userId, existing.spentAt);

            const sourceExists = Boolean(
                await SourcesOfMoneyModel.exists({
                    _id: existing.sourceOfMoneyId,
                    userId: user.userId,
                    ...NOT_ARCHIVED,
                }),
            );
            const skipBalance = !sourceExists;

            if (!skipBalance) {
                await adjustSourceBalance(
                    user.userId,
                    existing.sourceOfMoneyId.toString(),
                    existing.amount,
                    "revert",
                );
            }

            try {
                await ExpensesModel.findOneAndDelete({
                    _id: id,
                    userId: user.userId,
                });
            } catch (deleteError) {
                if (!skipBalance) {
                    await safeRollback(
                        {
                            userId: user.userId,
                            sourceOfMoneyId: existing.sourceOfMoneyId,
                            operation: "expense.delete",
                            step: "reapply-balance",
                            amount: existing.amount,
                            originalError: deleteError,
                        },
                        () =>
                            adjustSourceBalance(
                                user.userId,
                                existing.sourceOfMoneyId.toString(),
                                existing.amount,
                                "apply",
                            ),
                    );
                }
                throw deleteError;
            }

            await recordTransactionAudit({
                userId: user.userId,
                kind: TransactionAuditKind.EXPENSE,
                refId: id,
                action: TransactionAuditAction.DELETE,
                before: existing,
            });
            return successResponse(null, "Xóa chi tiêu thành công");
        } catch (error: unknown) {
            const message =
                error instanceof Error ? error.message : "Xóa chi tiêu thất bại";
            return errorResponseWithStatusCode(message, 400);
        }
    }
}
