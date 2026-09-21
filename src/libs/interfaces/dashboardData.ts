export interface IExpenseByCategoryItem {
    categoryId: string;
    categoryName: string;
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
}

export interface IDashboardExpensesSummaryQuery {
    year: number;
    month: number;
}
