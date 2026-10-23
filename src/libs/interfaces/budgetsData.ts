export interface IBudgetData {
    _id: string;
    /** null = ngân sách tổng cho mọi chi tiêu */
    categoryId: string | null;
    categoryName: string;
    /** Hạn mức mỗi tháng */
    amount: number;
    /** Đã chi trong tháng đang xem (gồm phí chuyển tiền) */
    spent: number;
    /** amount − spent, âm khi vượt */
    remaining: number;
    /** spent / amount */
    ratio: number;
}

export interface IBudgetsSummary {
    year: number;
    month: number;
    items: IBudgetData[];
}

export interface IBudgetsQuery {
    year: number;
    month: number;
}

export interface IFromBudgetData {
    /** Bỏ trống = ngân sách tổng */
    categoryId?: string | null;
    amount: number;
}

/** Từ ngưỡng này (tỷ lệ đã chi) thì cảnh báo sắp vượt. */
export const BUDGET_WARNING_RATIO = 0.8;
