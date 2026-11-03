import type { SourcesOfMoneyType } from "./sourcesOfMoneyData";

export interface IExpenseByCategoryItem {
    categoryId: string;
    categoryName: string;
    total: number;
}

export interface IExpenseBySourceItem {
    sourceId: string;
    sourceName: string;
    /** null when the source was deleted */
    sourceType: SourcesOfMoneyType | null;
    total: number;
}

export interface IExpenseByDayItem {
    day: number;
    label: string;
    total: number;
}

export interface IDashboardExpensesSummary {
    year: number;
    month: number;
    totalAmount: number;
    byCategory: IExpenseByCategoryItem[];
    byDay: IExpenseByDayItem[];
    bySource: IExpenseBySourceItem[];
}

export interface IDashboardExpensesSummaryQuery {
    year: number;
    month: number;
}

export interface ICashflowMonthItem {
    year: number;
    month: number;
    /** "MM/YY" */
    label: string;
    income: number;
    expense: number;
    net: number;
}

export interface IDashboardCashflowSummary {
    year: number;
    month: number;
    totalIncome: number;
    totalExpense: number;
    /** totalIncome − totalExpense */
    net: number;
    /** net / totalIncome, null khi tháng không có thu nhập */
    savingsRate: number | null;
    /** Cả tháng liền trước */
    previous: { totalIncome: number; totalExpense: number; net: number } | null;
    /** daysElapsed: tháng hiện tại = hôm nay (giờ VN), tháng đã qua = cả tháng, tháng tương lai = 0 */
    period: { daysElapsed: number; daysInMonth: number; isCurrentMonth: boolean };
    /** Chỉ có khi đang xem tháng hiện tại: ngày 1 → ngày `toDay` của tháng trước */
    samePeriodPrevious: {
        totalIncome: number;
        totalExpense: number;
        net: number;
        toDay: number;
    } | null;
    /** 6 tháng gần nhất, tăng dần, phần tử cuối là tháng đang chọn */
    trend: ICashflowMonthItem[];
    incomeByCategory: IExpenseByCategoryItem[];
}
