import mongoose from "mongoose";
import dbConnect from "@/server/connectDb";
import IncomesModel from "@/server/models/incomes.model";
import CategoriesModel from "@/server/models/categories.model";
import SourcesOfMoneyModel from "@/server/models/sources-of-money.model";
import {
    type IFromIncomesData,
    type IPaginatedIncomesQuery,
} from "@/libs/interfaces/incomesData";
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

function normalizePayload(data: IFromIncomesData) {
    const categoryId = data.categoryId?.trim();
    const sourceOfMoneyId = data.sourceOfMoneyId?.trim();
    const note = data.note?.trim() || "";

    if (!categoryId) throw new Error("Danh mục là bắt buộc");
    if (!sourceOfMoneyId) throw new Error("Nguồn tiền là bắt buộc");
    const amount = parseMoney(data.amount, "Số tiền");
    const receivedAt = parseTransactionDate(data.receivedAt, "Ngày thu");

    return { categoryId, sourceOfMoneyId, amount, note, receivedAt };
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
        if (category.kind && category.kind !== CategoryKind.INCOME) {
            throw new Error("Danh mục này dành cho chi tiêu, hãy chọn danh mục thu nhập");
        }
    }
    if (sourceOfMoneyId !== current?.sourceOfMoneyId && source.archivedAt) {
        throw new Error("Nguồn tiền đã bị xóa");
    }

    return { category, source, sourceActive: !source.archivedAt };
}

const CREDIT_CARD_INCOME_MESSAGE =
    "Không ghi thu nhập vào thẻ tín dụng. Hãy dùng Chuyển tiền từ nguồn khác để trả nợ thẻ";

/**
 * Apply income: tăng số dư / giảm dư nợ thẻ (thẻ chỉ còn ở thu nhập cũ, xem CREDIT_CARD_INCOME_MESSAGE).
 * Revert income: giảm số dư / tăng lại dư nợ thẻ.
 */
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
        const debt = source.creditDetails?.currentDebt ?? 0;
        // apply: thanh toán dư nợ (−amount); revert: hoàn lại dư nợ (+amount)
        const debtDelta = direction === "apply" ? -amount : amount;
        const nextDebt = debt + debtDelta;

        if (direction === "apply" && amount > debt + 0.0001) {
            throw new Error("Số tiền thanh toán vượt dư nợ hiện tại");
        }
        if (nextDebt < -0.0001) {
            throw new Error("Không thể thanh toán dư nợ dưới 0");
        }

        const filter: Record<string, unknown> = {
            _id: sourceId,
            userId,
            type: SourcesOfMoneyType.CREDIT_CARD,
        };
        if (direction === "apply") {
            filter["creditDetails.currentDebt"] = { $gte: amount };
        }

        const updated = await SourcesOfMoneyModel.findOneAndUpdate(
            filter,
            { $inc: { "creditDetails.currentDebt": debtDelta } },
            { returnDocument: "after" },
        );
        if (!updated) {
            throw new Error(
                direction === "apply"
                    ? "Số tiền thanh toán vượt dư nợ hiện tại"
                    : "Hoàn dư nợ thẻ tín dụng thất bại",
            );
        }
        return updated;
    }

    // CASH / BANK / E_WALLET / OTHER: apply tăng số dư, revert giảm số dư
    const balanceDelta = direction === "apply" ? amount : -amount;
    const filter: Record<string, unknown> = {
        _id: sourceId,
        userId,
        type: { $ne: SourcesOfMoneyType.CREDIT_CARD },
    };
    if (direction === "revert") {
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
                ? "Cập nhật số dư nguồn tiền thất bại"
                : "Hoàn số dư nguồn tiền thất bại",
        );
    }
    return updated;
}

/**
 * Sửa số tiền trên cùng một nguồn: một lần `$inc` theo chênh lệch (`delta > 0` thu thêm,
 * `< 0` bớt — chỉ cần đủ phần bớt, không cần đủ cả khoản cũ).
 */
async function adjustSourceBalanceByDelta(userId: string, sourceId: string, delta: number) {
    if (delta === 0) return null;
    return delta > 0
        ? adjustSourceBalance(userId, sourceId, delta, "apply")
        : adjustSourceBalance(userId, sourceId, -delta, "revert");
}

async function getPopulatedIncome(id: string, userId: string) {
    return IncomesModel.findOne({ _id: id, userId })
        .populate("categoryId", "name icon color archivedAt")
        .populate("sourceOfMoneyId", "name type balance creditDetails archivedAt")
        .lean();
}

export class IncomesService {
    static async getIncomes(query: IPaginatedIncomesQuery) {
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

        const receivedAt = buildListDateRange(from, to);
        if (receivedAt) filter.receivedAt = receivedAt;

        const [items, total] = await Promise.all([
            IncomesModel.find(filter)
                .populate("categoryId", "name icon color archivedAt")
                .populate("sourceOfMoneyId", "name type balance creditDetails archivedAt")
                .skip((page - 1) * limit)
                .limit(limit)
                .sort({ receivedAt: -1, createdAt: -1 })
                .lean(),
            IncomesModel.countDocuments(filter),
        ]);
        const { summary, dayTotals, breakdown } = await buildListSummary(IncomesModel, filter, items, {
            dateField: "receivedAt",
            breakdown: { field: "categoryId", from: CategoriesModel.collection.name },
        });

        return successResponsePageNation(items, total, page, limit, "", {
            summary,
            dayTotals,
            breakdown,
        });
    }

    static async createIncome(data: IFromIncomesData) {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) return unauthorizedResponse();

        try {
            const payload = normalizePayload(data);
            await assertLedgerUnlocked(user.userId, payload.receivedAt);
            const { source } = await assertOwnedRefs(
                user.userId,
                payload.categoryId,
                payload.sourceOfMoneyId,
            );
            if (source.type === SourcesOfMoneyType.CREDIT_CARD) {
                throw new Error(CREDIT_CARD_INCOME_MESSAGE);
            }

            await adjustSourceBalance(
                user.userId,
                payload.sourceOfMoneyId,
                payload.amount,
                "apply",
            );

            try {
                const created = await IncomesModel.create({
                    ...payload,
                    userId: user.userId,
                    categoryId: new mongoose.Types.ObjectId(payload.categoryId),
                    sourceOfMoneyId: new mongoose.Types.ObjectId(
                        payload.sourceOfMoneyId,
                    ),
                });

                const populated = await getPopulatedIncome(
                    created._id.toString(),
                    user.userId,
                );
                // Không throw (lỗi ghi lịch sử chỉ warn) nên không kéo theo rollback
                await recordAgentCreateAudit({
                    userId: user.userId,
                    kind: TransactionAuditKind.INCOME,
                    created: populated,
                });
                return successResponse(populated, "Tạo thu nhập thành công");
            } catch (createError) {
                await safeRollback(
                    {
                        userId: user.userId,
                        sourceOfMoneyId: payload.sourceOfMoneyId,
                        operation: "income.create",
                        step: "revert-balance",
                        amount: payload.amount,
                        originalError: createError,
                    },
                    () =>
                        adjustSourceBalance(
                            user.userId,
                            payload.sourceOfMoneyId,
                            payload.amount,
                            "revert",
                        ),
                );
                throw createError;
            }
        } catch (error: unknown) {
            const message =
                error instanceof Error ? error.message : "Tạo thu nhập thất bại";
            return errorResponseWithStatusCode(message, 400);
        }
    }

    static async updateIncome(id: string, data: IFromIncomesData) {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) return unauthorizedResponse();

        try {
            const existing = await IncomesModel.findOne({
                _id: id,
                userId: user.userId,
            });
            if (!existing) {
                return errorResponseWithStatusCode("Không tìm thấy thu nhập", 404);
            }

            const payload = normalizePayload(data);
            await assertLedgerUnlocked(user.userId, existing.receivedAt, payload.receivedAt);
            const oldSourceId = existing.sourceOfMoneyId.toString();
            const oldAmount = existing.amount;
            const { source: newSource, sourceActive: newSourceActive } = await assertOwnedRefs(
                user.userId,
                payload.categoryId,
                payload.sourceOfMoneyId,
                { categoryId: existing.categoryId.toString(), sourceOfMoneyId: oldSourceId },
            );
            // Thu nhập cũ trên thẻ chỉ được xóa hoặc chuyển sang nguồn khác
            if (newSource.type === SourcesOfMoneyType.CREDIT_CARD) {
                throw new Error(CREDIT_CARD_INCOME_MESSAGE);
            }
            // Nguồn đã xóa hoặc lưu trữ: bỏ qua phía đó, không hoàn số dư
            const oldSourceExists = Boolean(
                await SourcesOfMoneyModel.exists({
                    _id: oldSourceId,
                    userId: user.userId,
                    ...NOT_ARCHIVED,
                }),
            );

            const context = { userId: user.userId, operation: "income.update" };
            // Cùng nguồn còn hoạt động: một bước theo chênh lệch. Đổi nguồn: hoàn cũ rồi cộng mới.
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
                const updated = await IncomesModel.findOneAndUpdate(
                    { _id: id, userId: user.userId },
                    {
                        categoryId: new mongoose.Types.ObjectId(payload.categoryId),
                        sourceOfMoneyId: new mongoose.Types.ObjectId(
                            payload.sourceOfMoneyId,
                        ),
                        amount: payload.amount,
                        note: payload.note,
                        receivedAt: payload.receivedAt,
                    },
                    { returnDocument: "after" },
                );

                if (!updated) {
                    throw new Error("Cập nhật thu nhập thất bại");
                }
                await recordTransactionAudit({
                    userId: user.userId,
                    kind: TransactionAuditKind.INCOME,
                    refId: id,
                    action: TransactionAuditAction.UPDATE,
                    before: existing,
                    after: updated,
                });

                const populated = await getPopulatedIncome(id, user.userId);
                return successResponse(populated, "Cập nhật thu nhập thành công");
            } catch (updateError) {
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
                error instanceof Error ? error.message : "Cập nhật thu nhập thất bại";
            return errorResponseWithStatusCode(message, 400);
        }
    }

    static async deleteIncome(id: string) {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) return unauthorizedResponse();

        try {
            const existing = await IncomesModel.findOne({
                _id: id,
                userId: user.userId,
            });
            if (!existing) {
                return errorResponseWithStatusCode("Không tìm thấy thu nhập", 404);
            }
            await assertLedgerUnlocked(user.userId, existing.receivedAt);

            const sourceExists = Boolean(
                await SourcesOfMoneyModel.exists({
                    _id: existing.sourceOfMoneyId,
                    userId: user.userId,
                    ...NOT_ARCHIVED,
                }),
            );

            if (sourceExists) {
                await adjustSourceBalance(
                    user.userId,
                    existing.sourceOfMoneyId.toString(),
                    existing.amount,
                    "revert",
                );
            }

            try {
                await IncomesModel.findOneAndDelete({
                    _id: id,
                    userId: user.userId,
                });
            } catch (deleteError) {
                if (sourceExists) {
                    await safeRollback(
                        {
                            userId: user.userId,
                            sourceOfMoneyId: existing.sourceOfMoneyId,
                            operation: "income.delete",
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
                kind: TransactionAuditKind.INCOME,
                refId: id,
                action: TransactionAuditAction.DELETE,
                before: existing,
            });
            return successResponse(null, "Xóa thu nhập thành công");
        } catch (error: unknown) {
            const message =
                error instanceof Error ? error.message : "Xóa thu nhập thất bại";
            return errorResponseWithStatusCode(message, 400);
        }
    }
}
