import { IDefaultQuery } from "./DefaultQuery";
import type { SourcesOfMoneyType } from "./sourcesOfMoneyData";

export interface ITransferSourceRef {
    _id: string;
    name: string;
    type: SourcesOfMoneyType;
    balance?: number;
    creditDetails?: {
        creditLimit: number;
        currentDebt: number;
        statementDate?: number;
        dueDate?: number;
    };
    availableCreditLimit?: number | null;
}

export interface ITransferCategoryRef {
    _id: string;
    name: string;
}

export interface ITransfersData {
    _id: string;
    fromSourceId: string | ITransferSourceRef;
    toSourceId: string | ITransferSourceRef;
    amount: number;
    feePercent: number;
    feeAmount: number;
    feeCategoryId?: string | ITransferCategoryRef | null;
    feeExpenseId?: string | null;
    note?: string;
    transferredAt: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface IFromTransfersData {
    fromSourceId: string;
    toSourceId: string;
    amount: number;
    feePercent?: number;
    feeCategoryId?: string;
    note?: string;
    transferredAt?: string | Date;
}

export interface IPaginatedTransfersQuery extends IDefaultQuery {
    fromSourceId?: string;
    toSourceId?: string;
    from?: string;
    to?: string;
}
