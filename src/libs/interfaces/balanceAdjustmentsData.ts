export enum BalanceAdjustmentField {
    BALANCE = "BALANCE",
    CREDIT_DEBT = "CREDIT_DEBT",
}

/** OPENING: số dư/dư nợ ban đầu (khi tạo nguồn hoặc bổ sung bằng script); MANUAL: sửa tay trên form */
export enum BalanceAdjustmentKind {
    OPENING = "OPENING",
    MANUAL = "MANUAL",
}

export const BALANCE_ADJUSTMENT_FIELD_LABELS: Record<BalanceAdjustmentField, string> = {
    [BalanceAdjustmentField.BALANCE]: "Số dư",
    [BalanceAdjustmentField.CREDIT_DEBT]: "Dư nợ",
};

export interface IBalanceAdjustmentData {
    _id: string;
    sourceOfMoneyId: string;
    field: BalanceAdjustmentField;
    kind?: BalanceAdjustmentKind;
    previousValue: number;
    newValue: number;
    delta: number;
    note?: string;
    adjustedAt: string;
    createdAt?: string;
}
