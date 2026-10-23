import { IDefaultQuery } from "./DefaultQuery";

export enum SourcesOfMoneyType {
    BANK = "BANK",
    CASH = "CASH",
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
    sortOrder: number;
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
    sortOrder?: number;
    creditDetails?: Partial<ICreditDetails>;
    metadata?: Record<string, unknown>;
    /**
     * Khi sửa: số dư (nguồn thường) hoặc dư nợ (thẻ) lúc mở form. Giá trị mới bằng giá trị này
     * thì server giữ nguyên số trong DB; khác thì chỉ ghi đè khi DB vẫn bằng giá trị này.
     */
    expectedAmount?: number;
    /** Ghi chú cho lần điều chỉnh số dư/dư nợ */
    adjustmentNote?: string;
}

export interface IReorderSourcesOfMoneyData {
    orderedIds: string[];
}

export interface IPaginatedSourcesOfMoneyQuery extends IDefaultQuery {
    type?: SourcesOfMoneyType | "";
}

export const SOURCES_OF_MONEY_TYPE_LABELS: Record<SourcesOfMoneyType, string> = {
    [SourcesOfMoneyType.BANK]: "Ngân hàng",
    [SourcesOfMoneyType.E_WALLET]: "Ví điện tử",
    [SourcesOfMoneyType.CREDIT_CARD]: "Thẻ tín dụng",
    [SourcesOfMoneyType.CASH]: "Tiền mặt",
    [SourcesOfMoneyType.OTHER]: "Khác",
};
