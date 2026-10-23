import mongoose from "mongoose";
import dbConnect from "@/server/connectDb";
import ExpensesModel from "@/server/models/expenses.model";
import IncomesModel from "@/server/models/incomes.model";
import CategoriesModel from "@/server/models/categories.model";
import SourcesOfMoneyModel from "@/server/models/sources-of-money.model";
import type {
    ICashflowMonthItem,
    IDashboardExpensesSummaryQuery,
} from "@/libs/interfaces/dashboardData";
import {
    errorResponseWithStatusCode,
    successResponse,
    unauthorizedResponse,
} from "../utils/responseServer";
import { getCurrentUser } from "../utils/getCurrentUser";
import { getMonthRange, isValidMonth, pad2 } from "../utils/monthRange";


const TIMEZONE = "Asia/Ho_Chi_Minh";
/** Số tháng của biểu đồ xu hướng, tính lùi từ tháng đang chọn (gồm cả tháng đó). */
const TREND_MONTHS = 6;

/** Lùi `offset` tháng từ year/month (month 1–12). */
function shiftMonth(year: number, month: number, offset: number) {
    const index = year * 12 + (month - 1) + offset;
    return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

function monthKey(year: number, month: number) {
    return `${year}-${pad2(month)}`;
}

/** Tổng amount theo tháng (YYYY-MM, giờ VN) trong khoảng thời gian. */
async function sumByMonth(
    model: typeof ExpensesModel,
    dateField: "spentAt" | "receivedAt",
    userId: mongoose.Types.ObjectId,
    start: Date,
    end: Date,
) {
    const rows: { _id: string; total: number }[] = await model.aggregate([
        { $match: { userId, [dateField]: { $gte: start, $lte: end } } },
        {
            $group: {
                _id: {
                    $dateToString: { format: "%Y-%m", date: `$${dateField}`, timezone: TIMEZONE },
                },
                total: { $sum: "$amount" },
            },
        },
    ]);
    return new Map(rows.map((row) => [row._id, row.total]));
}

export class DashboardService {
    static async getCashflowSummary(query: IDashboardExpensesSummaryQuery) {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) {
            return unauthorizedResponse();
        }

        const year = Number(query.year);
        const month = Number(query.month);
        if (!isValidMonth(year, month)) {
            return errorResponseWithStatusCode("Tháng/năm không hợp lệ", 400);
        }

        const first = shiftMonth(year, month, -(TREND_MONTHS - 1));
        const { start: rangeStart } = getMonthRange(first.year, first.month);
        const { start: monthStart, end: monthEnd } = getMonthRange(year, month);
        const userObjectId = new mongoose.Types.ObjectId(user.userId);

        const [expenseByMonth, incomeByMonth, incomeByCategoryAgg] = await Promise.all([
            sumByMonth(ExpensesModel, "spentAt", userObjectId, rangeStart, monthEnd),
            sumByMonth(IncomesModel, "receivedAt", userObjectId, rangeStart, monthEnd),
            IncomesModel.aggregate([
                {
                    $match: {
                        userId: userObjectId,
                        receivedAt: { $gte: monthStart, $lte: monthEnd },
                    },
                },
                { $group: { _id: "$categoryId", total: { $sum: "$amount" } } },
                {
                    $lookup: {
                        from: CategoriesModel.collection.name,
                        localField: "_id",
                        foreignField: "_id",
                        as: "category",
                    },
                },
                { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        _id: 0,
                        categoryId: { $toString: "$_id" },
                        categoryName: { $ifNull: ["$category.name", "Không xác định"] },
                        total: 1,
                        sortOrder: { $ifNull: ["$category.sortOrder", 9999] },
                    },
                },
                { $sort: { total: -1, sortOrder: 1 } },
            ]),
        ]);

        const trend: ICashflowMonthItem[] = Array.from({ length: TREND_MONTHS }, (_, index) => {
            const item = shiftMonth(first.year, first.month, index);
            const key = monthKey(item.year, item.month);
            const income = incomeByMonth.get(key) ?? 0;
            const expense = expenseByMonth.get(key) ?? 0;
            return {
                year: item.year,
                month: item.month,
                label: `${pad2(item.month)}/${String(item.year).slice(-2)}`,
                income,
                expense,
                net: income - expense,
            };
        });

        const current = trend[trend.length - 1];
        const previous = trend[trend.length - 2];

        return successResponse(
            {
                year,
                month,
                totalIncome: current.income,
                totalExpense: current.expense,
                net: current.net,
                // Không có thu nhập thì tỷ lệ tiết kiệm không có nghĩa
                savingsRate: current.income > 0 ? current.net / current.income : null,
                previous: previous
                    ? {
                          totalIncome: previous.income,
                          totalExpense: previous.expense,
                          net: previous.net,
                      }
                    : null,
                trend,
                incomeByCategory: incomeByCategoryAgg.map(
                    (item: { categoryId: string; categoryName: string; total: number }) => ({
                        categoryId: item.categoryId,
                        categoryName: item.categoryName,
                        total: item.total,
                    }),
                ),
            },
            "Lấy thống kê dòng tiền thành công",
        );
    }

    static async getExpensesSummary(query: IDashboardExpensesSummaryQuery) {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) {
            return unauthorizedResponse();
        }

        const year = Number(query.year);
        const month = Number(query.month);

        if (!isValidMonth(year, month)) {
            return errorResponseWithStatusCode("Tháng/năm không hợp lệ", 400);
        }

        const { start, end, daysInMonth } = getMonthRange(year, month);
        const userObjectId = new mongoose.Types.ObjectId(user.userId);

        const monthMatch = {
            $match: {
                userId: userObjectId,
                spentAt: { $gte: start, $lte: end },
            },
        };

        const [byCategoryAgg, byDayAgg, bySourceAgg] = await Promise.all([
            ExpensesModel.aggregate([
                monthMatch,
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
                monthMatch,
                {
                    $group: {
                        _id: {
                            $dayOfMonth: {
                                date: "$spentAt",
                                timezone: TIMEZONE,
                            },
                        },
                        total: { $sum: "$amount" },
                    },
                },
                { $sort: { _id: 1 } },
            ]),
            ExpensesModel.aggregate([
                monthMatch,
                {
                    $group: {
                        _id: "$sourceOfMoneyId",
                        total: { $sum: "$amount" },
                    },
                },
                {
                    $lookup: {
                        from: SourcesOfMoneyModel.collection.name,
                        localField: "_id",
                        foreignField: "_id",
                        as: "source",
                    },
                },
                {
                    $unwind: {
                        path: "$source",
                        preserveNullAndEmptyArrays: true,
                    },
                },
                {
                    $project: {
                        _id: 0,
                        sourceId: { $toString: "$_id" },
                        sourceName: {
                            $ifNull: ["$source.name", "Không xác định"],
                        },
                        sourceType: { $ifNull: ["$source.type", null] },
                        total: 1,
                        sortOrder: { $ifNull: ["$source.sortOrder", 9999] },
                    },
                },
                { $sort: { total: -1, sortOrder: 1 } },
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

        const bySource = bySourceAgg.map(
            (item: {
                sourceId: string;
                sourceName: string;
                sourceType: string | null;
                total: number;
            }) => ({
                sourceId: item.sourceId,
                sourceName: item.sourceName,
                sourceType: item.sourceType,
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
                bySource,
            },
            "Lấy thống kê chi tiêu thành công",
        );
    }
}
