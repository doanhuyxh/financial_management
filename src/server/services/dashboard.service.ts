import mongoose from "mongoose";
import dbConnect from "@/server/connectDb";
import ExpensesModel from "@/server/models/expenses.model";
import CategoriesModel from "@/server/models/categories.model";
import type { IDashboardExpensesSummaryQuery } from "@/libs/interfaces/dashboardData";
import {
    errorResponseWithStatusCode,
    successResponse,
    unauthorizedResponse,
} from "../utils/responseServer";
import { getCurrentUser } from "../utils/getCurrentUser";

function pad2(n: number) {
    return String(n).padStart(2, "0");
}

function getMonthRange(year: number, month: number) {
    const daysInMonth = new Date(year, month, 0).getDate();
    const start = new Date(`${year}-${pad2(month)}-01T00:00:00.000+07:00`);
    const end = new Date(
        `${year}-${pad2(month)}-${pad2(daysInMonth)}T23:59:59.999+07:00`,
    );
    return { start, end, daysInMonth };
}

export class DashboardService {
    static async getExpensesSummary(query: IDashboardExpensesSummaryQuery) {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) {
            return unauthorizedResponse();
        }

        const year = Number(query.year);
        const month = Number(query.month);

        if (
            !Number.isInteger(year) ||
            !Number.isInteger(month) ||
            month < 1 ||
            month > 12
        ) {
            return errorResponseWithStatusCode("Tháng/năm không hợp lệ", 400);
        }

        const { start, end, daysInMonth } = getMonthRange(year, month);
        const userObjectId = new mongoose.Types.ObjectId(user.userId);

        const [byCategoryAgg, byDayAgg] = await Promise.all([
            ExpensesModel.aggregate([
                {
                    $match: {
                        userId: userObjectId,
                        spentAt: { $gte: start, $lte: end },
                    },
                },
                {
                    $group: {
                        _id: "$categoryId",
                        total: { $sum: "$amount" },
                    },
                },
                {
                    $lookup: {
                        from: CategoriesModel.collection.name,
                        localField: "_id",
                        foreignField: "_id",
                        as: "category",
                    },
                },
                {
                    $unwind: {
                        path: "$category",
                        preserveNullAndEmptyArrays: true,
                    },
                },
                {
                    $project: {
                        _id: 0,
                        categoryId: { $toString: "$_id" },
                        categoryName: {
                            $ifNull: ["$category.name", "Không xác định"],
                        },
                        total: 1,
                        sortOrder: { $ifNull: ["$category.sortOrder", 9999] },
                    },
                },
                { $sort: { total: -1, sortOrder: 1 } },
            ]),
            ExpensesModel.aggregate([
                {
                    $match: {
                        userId: userObjectId,
                        spentAt: { $gte: start, $lte: end },
                    },
                },
                {
                    $group: {
                        _id: {
                            $dayOfMonth: {
                                date: "$spentAt",
                                timezone: "Asia/Ho_Chi_Minh",
                            },
                        },
                        total: { $sum: "$amount" },
                    },
                },
                { $sort: { _id: 1 } },
            ]),
        ]);

        const dayMap = new Map<number, number>(
            byDayAgg.map((item: { _id: number; total: number }) => [
                item._id,
                item.total,
            ]),
        );

        const byDay = Array.from({ length: daysInMonth }, (_, index) => {
            const day = index + 1;
            return {
                day,
                label: String(day),
                total: dayMap.get(day) ?? 0,
            };
        });

        const byCategory = byCategoryAgg.map(
            (item: {
                categoryId: string;
                categoryName: string;
                total: number;
            }) => ({
                categoryId: item.categoryId,
                categoryName: item.categoryName,
                total: item.total,
            }),
        );

        const totalAmount = byCategory.reduce(
            (sum: number, item: { total: number }) => sum + item.total,
            0,
        );

        return successResponse(
            {
                year,
                month,
                totalAmount,
                byCategory,
                byDay,
            },
            "Lấy thống kê chi tiêu thành công",
        );
    }
}
