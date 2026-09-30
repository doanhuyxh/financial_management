import { IDefaultQuery } from "./DefaultQuery";
import type { SourcesOfMoneyType } from "./sourcesOfMoneyData";

export interface IIncomeCategoryRef {
    _id: string;
    name: string;
}

export interface IIncomeSourceRef {
    _id: string;
    name: string;
    type: SourcesOfMoneyType;
    balance?: number;
    availableCreditLimit?: number | null;
    creditDetails?: {
        creditLimit?: number;
        currentDebt?: number;
    };
}

export interface IIncomesData {
    _id: string;
    categoryId: string | IIncomeCategoryRef;
    sourceOfMoneyId: string | IIncomeSourceRef;
    amount: number;
    note?: string;
    receivedAt: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface IFromIncomesData {
    categoryId: string;
    sourceOfMoneyId: string;
    amount: number;
    note?: string;
    receivedAt?: string | Date;
}

export interface IPaginatedIncomesQuery extends IDefaultQuery {
    categoryId?: string;
    sourceOfMoneyId?: string;
    from?: string;
    to?: string;
}
