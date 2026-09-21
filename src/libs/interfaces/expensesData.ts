import { IDefaultQuery } from "./DefaultQuery";
import type { SourcesOfMoneyType } from "./sourcesOfMoneyData";

export interface IExpenseCategoryRef {
    _id: string;
    name: string;
}

export interface IExpenseSourceRef {
    _id: string;
    name: string;
    type: SourcesOfMoneyType;
    balance?: number;
    availableCreditLimit?: number | null;
}

export interface IExpensesData {
    _id: string;
    categoryId: string | IExpenseCategoryRef;
    sourceOfMoneyId: string | IExpenseSourceRef;
    amount: number;
    note?: string;
    spentAt: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface IFromExpensesData {
    categoryId: string;
    sourceOfMoneyId: string;
    amount: number;
    note?: string;
    spentAt?: string | Date;
}

export interface IPaginatedExpensesQuery extends IDefaultQuery {
    categoryId?: string;
    sourceOfMoneyId?: string;
    from?: string;
    to?: string;
}
