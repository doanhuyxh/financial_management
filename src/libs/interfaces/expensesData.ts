import { IDefaultQuery } from "./DefaultQuery";
import type { SourcesOfMoneyType } from "./sourcesOfMoneyData";

export interface IExpenseCategoryRef {
    _id: string;
    name: string;
    archivedAt?: string | null;
}

export interface IExpenseSourceRef {
    _id: string;
    name: string;
    archivedAt?: string | null;
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
    /** Phí chuyển tiền: chỉ thay đổi qua giao dịch chuyển tiền gốc */
    skipBalanceAdjust?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

/** Giá trị điền sẵn khi mở form tạo chi tiêu từ màn hình khác. */
export interface IExpenseCreateDefaults {
    sourceOfMoneyId?: string;
    amount?: number;
    note?: string;
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
