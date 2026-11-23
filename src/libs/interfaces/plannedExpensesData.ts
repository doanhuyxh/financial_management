import type { IExpenseCategoryRef, IExpenseSourceRef } from "./expensesData";

/**
 * Khoản chi dự kiến (chi trong tương lai): giữ chỗ tiền của nguồn (`reservedAmount`) cho tới khi
 * người dùng bấm Xác nhận (thành chi tiêu thật) hoặc Hủy. Không bao giờ tự trừ.
 */
export enum PlannedExpenseStatus {
    PENDING = "PENDING",
    CONFIRMED = "CONFIRMED",
    CANCELLED = "CANCELLED",
}

export interface IPlannedExpensesData {
    _id: string;
    categoryId: string | IExpenseCategoryRef;
    sourceOfMoneyId: string | IExpenseSourceRef;
    amount: number;
    note?: string;
    /** 12:00 giờ VN của ngày dự kiến chi */
    plannedAt: string;
    status: PlannedExpenseStatus;
    /** Chi tiêu tạo ra khi xác nhận */
    expenseId?: string | null;
    confirmedAt?: string | null;
    cancelledAt?: string | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface IFromPlannedExpensesData {
    categoryId: string;
    sourceOfMoneyId: string;
    amount: number;
    note?: string;
    /** YYYY-MM-DD giờ VN, phải sau hôm nay */
    plannedDate: string;
}

export interface IPlannedExpensesQuery {
    status?: PlannedExpenseStatus;
}
