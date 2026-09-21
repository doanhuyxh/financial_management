import { IDefaultQuery } from "./DefaultQuery";

export enum SourcesOfMoneyType {
    CASH = "CASH",
    BANK = "BANK",
    CREDIT_CARD = "CREDIT_CARD",
    E_WALLET = "E_WALLET",
    OTHER = "OTHER",
}

export interface ICreditDetails {
    creditLimit: number;
    currentDebt: number;
    statementDate?: number;
    dueDate?: number;
}

export interface ISourcesOfMoneyData {
    _id: string;
    name: string;
    type: SourcesOfMoneyType;
    balance: number;
    creditDetails?: ICreditDetails;
    metadata?: Record<string, unknown>;
    availableCreditLimit?: number | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface IFromSourcesOfMoneyData {
    name: string;
    type: SourcesOfMoneyType;
    balance?: number;
    creditDetails?: Partial<ICreditDetails>;
    metadata?: Record<string, unknown>;
}

export interface IPaginatedSourcesOfMoneyQuery extends IDefaultQuery {
    type?: SourcesOfMoneyType | "";
}

export const SOURCES_OF_MONEY_TYPE_LABELS: Record<SourcesOfMoneyType, string> = {
    [SourcesOfMoneyType.CASH]: "Tiền mặt",
    [SourcesOfMoneyType.BANK]: "Ngân hàng",
    [SourcesOfMoneyType.CREDIT_CARD]: "Thẻ tín dụng",
    [SourcesOfMoneyType.E_WALLET]: "Ví điện tử",
    [SourcesOfMoneyType.OTHER]: "Khác",
};
