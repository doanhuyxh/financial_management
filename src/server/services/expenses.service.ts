import mongoose from "mongoose";
import dbConnect from "@/server/connectDb";
import ExpensesModel from "@/server/models/expenses.model";
import CategoriesModel from "@/server/models/categories.model";
import SourcesOfMoneyModel from "@/server/models/sources-of-money.model";
import {
    type IFromExpensesData,
    type IPaginatedExpensesQuery,
} from "@/libs/interfaces/expensesData";
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

function normalizePayload(data: IFromExpensesData) {
    const categoryId = data.categoryId?.trim();
    const sourceOfMoneyId = data.sourceOfMoneyId?.trim();
    const amount = Number(data.amount);
    const note = data.note?.trim() || "";
    const spentAt = data.spentAt ? new Date(data.spentAt) : new Date();

    if (!categoryId) throw new Error("Danh mục là bắt buộc");
    if (!sourceOfMoneyId) throw new Error("Nguồn tiền là bắt buộc");
    if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Số tiền phải lớn hơn 0");
    }
    if (Number.isNaN(spentAt.getTime())) {
        throw new Error("Ngày chi không hợp lệ");
    }

    return { categoryId, sourceOfMoneyId, amount, note, spentAt };
}

/** `currentCategoryId`: danh mục đang gắn với bản ghi khi sửa — giữ nguyên thì bỏ qua kiểm tra loại (dữ liệu cũ). */
async function assertOwnedRefs(
    userId: string,
    categoryId: string,
    sourceOfMoneyId: string,
    currentCategoryId?: string,
) {
    const [category, source] = await Promise.all([
        CategoriesModel.findOne({ _id: categoryId, userId }).select("_id name kind"),
        SourcesOfMoneyModel.findOne({ _id: sourceOfMoneyId, userId }),
    ]);

    if (!category) throw new Error("Không tìm thấy danh mục");
    if (!source) throw new Error("Không tìm thấy nguồn tiền");
    if (
        categoryId !== currentCategoryId &&
        category.kind &&
        category.kind !== CategoryKind.EXPENSE
    ) {
        throw new Error("Danh mục này dành cho thu nhập, hãy chọn danh mục chi tiêu");
    }

    return { category, source };
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
        .populate("categoryId", "name")
        .populate("sourceOfMoneyId", "name type balance creditDetails")
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

        if (from || to) {
            const spentAt: Record<string, Date> = {};
            if (from) spentAt.$gte = new Date(from);
            if (to) {
                const end = new Date(to);
                end.setHours(23, 59, 59, 999);
                spentAt.$lte = end;
            }
            filter.spentAt = spentAt;
        }

        const [items, total] = await Promise.all([
            ExpensesModel.find(filter)
                .populate("categoryId", "name")
                .populate("sourceOfMoneyId", "name type balance creditDetails")
                .skip((page - 1) * limit)
                .limit(limit)
                .sort({ spentAt: -1, createdAt: -1 })
                .lean(),
            ExpensesModel.countDocuments(filter),
        ]);

        return successResponsePageNation(items, total, page, limit);
    }

    static async createExpense(data: IFromExpensesData) {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) return unauthorizedResponse();

        try {
            const payload = normalizePayload(data);
            await assertOwnedRefs(
                user.userId,
                payload.categoryId,
                payload.sourceOfMoneyId,
            );

            await adjustSourceBalance(
                user.userId,
                payload.sourceOfMoneyId,
                payload.amount,
                "apply",
            );

            try {
                const created = await ExpensesModel.create({
                    ...payload,
                    userId: user.userId,
                    categoryId: new mongoose.Types.ObjectId(payload.categoryId),
                    sourceOfMoneyId: new mongoose.Types.ObjectId(
                        payload.sourceOfMoneyId,
                    ),
                });

                const populated = await getPopulatedExpense(
                    created._id.toString(),
                    user.userId,
                );
                return successResponse(populated, "Tạo chi tiêu thành công");
            } catch (createError) {
                await adjustSourceBalance(
                    user.userId,
                    payload.sourceOfMoneyId,
                    payload.amount,
                    "revert",
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
            await assertOwnedRefs(
                user.userId,
                payload.categoryId,
                payload.sourceOfMoneyId,
                existing.categoryId.toString(),
            );

            const oldSourceId = existing.sourceOfMoneyId.toString();
            const oldAmount = existing.amount;
            const oldSourceExists = Boolean(
                await SourcesOfMoneyModel.exists({ _id: oldSourceId, userId: user.userId }),
            );

            // Revert old effect, then apply new
            if (oldSourceExists) {
                await adjustSourceBalance(
                    user.userId,
                    oldSourceId,
                    oldAmount,
                    "revert",
                );
            }

            try {
                await adjustSourceBalance(
                    user.userId,
                    payload.sourceOfMoneyId,
                    payload.amount,
                    "apply",
                );
            } catch (applyError) {
                if (oldSourceExists) {
                    await adjustSourceBalance(
                        user.userId,
                        oldSourceId,
                        oldAmount,
                        "apply",
                    );
                }
                throw applyError;
            }

            try {
                const updated = await ExpensesModel.findOneAndUpdate(
                    { _id: id, userId: user.userId },
                    {
                        categoryId: new mongoose.Types.ObjectId(payload.categoryId),
                        sourceOfMoneyId: new mongoose.Types.ObjectId(
                            payload.sourceOfMoneyId,
                        ),
                        amount: payload.amount,
                        note: payload.note,
                        spentAt: payload.spentAt,
                    },
                    { returnDocument: "after" },
                );

                if (!updated) {
                    throw new Error("Cập nhật chi tiêu thất bại");
                }

                const populated = await getPopulatedExpense(id, user.userId);
                return successResponse(populated, "Cập nhật chi tiêu thành công");
            } catch (updateError) {
                // Roll back to previous balances
                await adjustSourceBalance(
                    user.userId,
                    payload.sourceOfMoneyId,
                    payload.amount,
                    "revert",
                );
                if (oldSourceExists) {
                    await adjustSourceBalance(
                        user.userId,
                        oldSourceId,
                        oldAmount,
                        "apply",
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

            const sourceExists = Boolean(
                await SourcesOfMoneyModel.exists({
                    _id: existing.sourceOfMoneyId,
                    userId: user.userId,
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
                    await adjustSourceBalance(
                        user.userId,
                        existing.sourceOfMoneyId.toString(),
                        existing.amount,
                        "apply",
                    );
                }
                throw deleteError;
            }

            return successResponse(null, "Xóa chi tiêu thành công");
        } catch (error: unknown) {
            const message =
                error instanceof Error ? error.message : "Xóa chi tiêu thất bại";
            return errorResponseWithStatusCode(message, 400);
        }
    }
}
