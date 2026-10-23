import mongoose from "mongoose";
import dbConnect from "@/server/connectDb";
import BudgetsModel from "@/server/models/budgets.model";
import CategoriesModel from "@/server/models/categories.model";
import ExpensesModel from "@/server/models/expenses.model";
import { CategoryKind } from "@/libs/interfaces/categoriesData";
import type { IBudgetData, IBudgetsQuery, IFromBudgetData } from "@/libs/interfaces/budgetsData";
import {
    errorResponseWithStatusCode,
    successResponse,
    unauthorizedResponse,
} from "../utils/responseServer";
import { getCurrentUser } from "../utils/getCurrentUser";
import { NOT_ARCHIVED } from "../utils/archived";
import { getMonthRange, isValidMonth } from "../utils/monthRange";

const TOTAL_BUDGET_NAME = "Tổng chi tiêu";

function normalizeAmount(value: unknown) {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Hạn mức phải lớn hơn 0");
    }
    return Math.round(amount);
}

function isDuplicateKeyError(error: unknown) {
    return Boolean(error && typeof error === "object" && "code" in error && error.code === 11000);
}

type BudgetDoc = { _id: mongoose.Types.ObjectId; categoryId: mongoose.Types.ObjectId | null; amount: number };

export class BudgetsService {
    static async getBudgets(query: IBudgetsQuery) {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) return unauthorizedResponse();

        const year = Number(query.year);
        const month = Number(query.month);
        if (!isValidMonth(year, month)) {
            return errorResponseWithStatusCode("Tháng/năm không hợp lệ", 400);
        }

        const { start, end } = getMonthRange(year, month);
        const userObjectId = new mongoose.Types.ObjectId(user.userId);

        const [budgets, categories, spentAgg] = await Promise.all([
            BudgetsModel.find({ userId: user.userId }).lean<BudgetDoc[]>(),
            CategoriesModel.find({ userId: user.userId, ...NOT_ARCHIVED })
                .select("_id name sortOrder")
                .lean<{ _id: mongoose.Types.ObjectId; name: string; sortOrder?: number }[]>(),
            ExpensesModel.aggregate<{ _id: mongoose.Types.ObjectId; total: number }>([
                { $match: { userId: userObjectId, spentAt: { $gte: start, $lte: end } } },
                { $group: { _id: "$categoryId", total: { $sum: "$amount" } } },
            ]),
        ]);

        const categoryById = new Map(categories.map((item) => [String(item._id), item]));
        const spentByCategory = new Map(spentAgg.map((row) => [String(row._id), row.total]));
        const totalSpent = spentAgg.reduce((sum, row) => sum + row.total, 0);

        const rows: { item: IBudgetData; sortOrder: number }[] = [];
        for (const budget of budgets) {
            const categoryId = budget.categoryId ? String(budget.categoryId) : null;
            // Danh mục đã xóa hoặc lưu trữ: ẩn ngân sách của nó
            const category = categoryId ? categoryById.get(categoryId) : null;
            if (categoryId && !category) continue;

            const spent = categoryId ? (spentByCategory.get(categoryId) ?? 0) : totalSpent;
            rows.push({
                item: {
                    _id: String(budget._id),
                    categoryId,
                    categoryName: category?.name ?? TOTAL_BUDGET_NAME,
                    amount: budget.amount,
                    spent,
                    remaining: budget.amount - spent,
                    ratio: budget.amount > 0 ? spent / budget.amount : 0,
                },
                sortOrder: category ? (category.sortOrder ?? 9999) : -1,
            });
        }

        // Ngân sách tổng đứng đầu, còn lại theo thứ tự danh mục
        rows.sort((a, b) => a.sortOrder - b.sortOrder);

        return successResponse(
            { year, month, items: rows.map((row) => row.item) },
            "Lấy ngân sách thành công",
        );
    }

    static async createBudget(data: IFromBudgetData) {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) return unauthorizedResponse();

        try {
            const amount = normalizeAmount(data.amount);
            const categoryId = data.categoryId?.trim() || null;

            if (categoryId) {
                const category = await CategoriesModel.findOne({
                    _id: categoryId,
                    userId: user.userId,
                    ...NOT_ARCHIVED,
                }).select("kind");
                if (!category) throw new Error("Không tìm thấy danh mục");
                if (category.kind && category.kind !== CategoryKind.EXPENSE) {
                    throw new Error("Chỉ đặt ngân sách cho danh mục chi tiêu");
                }
            }

            const created = await BudgetsModel.create({
                userId: user.userId,
                categoryId: categoryId ? new mongoose.Types.ObjectId(categoryId) : null,
                amount,
            });
            return successResponse(created.toJSON(), "Tạo ngân sách thành công");
        } catch (error: unknown) {
            if (isDuplicateKeyError(error)) {
                return errorResponseWithStatusCode(
                    data.categoryId
                        ? "Danh mục này đã có ngân sách"
                        : "Đã có ngân sách tổng",
                    400,
                );
            }
            const message = error instanceof Error ? error.message : "Tạo ngân sách thất bại";
            return errorResponseWithStatusCode(message, 400);
        }
    }

    /** Chỉ sửa hạn mức; muốn đổi danh mục thì xóa rồi tạo lại. */
    static async updateBudget(id: string, data: Pick<IFromBudgetData, "amount">) {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) return unauthorizedResponse();

        try {
            const amount = normalizeAmount(data.amount);
            const updated = await BudgetsModel.findOneAndUpdate(
                { _id: id, userId: user.userId },
                { $set: { amount } },
                { returnDocument: "after" },
            );
            if (!updated) {
                return errorResponseWithStatusCode("Không tìm thấy ngân sách", 404);
            }
            return successResponse(updated.toJSON(), "Cập nhật ngân sách thành công");
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Cập nhật ngân sách thất bại";
            return errorResponseWithStatusCode(message, 400);
        }
    }

    static async deleteBudget(id: string) {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) return unauthorizedResponse();

        const deleted = await BudgetsModel.findOneAndDelete({ _id: id, userId: user.userId });
        if (!deleted) {
            return errorResponseWithStatusCode("Không tìm thấy ngân sách", 404);
        }
        return successResponse(null, "Xóa ngân sách thành công");
    }
}
