export enum BalanceAdjustmentField {
    BALANCE = "BALANCE",
    CREDIT_DEBT = "CREDIT_DEBT",
}

export const BALANCE_ADJUSTMENT_FIELD_LABELS: Record<BalanceAdjustmentField, string> = {
    [BalanceAdjustmentField.BALANCE]: "Số dư",
    [BalanceAdjustmentField.CREDIT_DEBT]: "Dư nợ",
};

export interface IBalanceAdjustmentData {
    _id: string;
    sourceOfMoneyId: string;
    field: BalanceAdjustmentField;
    previousValue: number;
    newValue: number;
    delta: number;
    note?: string;
    adjustedAt: string;
    createdAt?: string;
}
