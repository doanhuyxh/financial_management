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
