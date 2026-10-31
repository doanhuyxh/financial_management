import { IDefaultQuery } from "./DefaultQuery";
import type { ForeignFeeType, SourcesOfMoneyType } from "./sourcesOfMoneyData";

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

/** Khoản chi là phí thẻ tín dụng: không tính vào điều kiện miễn phí của thẻ. */
export enum CardFeeType {
    ANNUAL_FEE = "ANNUAL_FEE",
    MANAGEMENT_FEE = "MANAGEMENT_FEE",
    PAYMENT_FEE = "PAYMENT_FEE",
    USAGE_FEE = "USAGE_FEE",
    FOREIGN_FEE = "FOREIGN_FEE",
    INTEREST = "INTEREST",
    LATE_FEE = "LATE_FEE",
}

export const CARD_FEE_TYPE_LABELS: Record<CardFeeType, string> = {
    [CardFeeType.ANNUAL_FEE]: "Phí thường niên",
    [CardFeeType.MANAGEMENT_FEE]: "Phí quản lý",
    [CardFeeType.PAYMENT_FEE]: "Phí thanh toán dư nợ",
    [CardFeeType.USAGE_FEE]: "Phí sử dụng",
    [CardFeeType.FOREIGN_FEE]: "Phí giao dịch quốc tế",
    [CardFeeType.INTEREST]: "Lãi thẻ",
    [CardFeeType.LATE_FEE]: "Phí chậm thanh toán",
};

export interface IExpensesData {
    _id: string;
    categoryId: string | IExpenseCategoryRef;
    sourceOfMoneyId: string | IExpenseSourceRef;
    amount: number;
    note?: string;
    spentAt: string;
    /** Phí chuyển tiền: chỉ thay đổi qua giao dịch chuyển tiền gốc */
    skipBalanceAdjust?: boolean;
    cardFeeType?: CardFeeType;
    createdAt?: string;
    updatedAt?: string;
}

/** Giá trị điền sẵn khi mở form tạo chi tiêu từ màn hình khác. */
export interface IExpenseCreateDefaults {
    sourceOfMoneyId?: string;
    amount?: number;
    note?: string;
    cardFeeType?: CardFeeType;
}

export interface IFromExpensesData {
    categoryId: string;
    sourceOfMoneyId: string;
    amount: number;
    note?: string;
    spentAt?: string | Date;
    /** Chỉ dùng khi tạo; nguồn phải là thẻ tín dụng */
    cardFeeType?: CardFeeType;
    /**
     * Chỉ dùng khi tạo, nguồn là thẻ có cấu hình phí tương ứng: server tạo kèm một khoản chi
     * phí giao dịch quốc tế (`cardFeeType = FOREIGN_FEE`) cùng danh mục.
     */
    foreignFeeType?: ForeignFeeType;
}

export interface IPaginatedExpensesQuery extends IDefaultQuery {
    categoryId?: string;
    sourceOfMoneyId?: string;
    from?: string;
    to?: string;
}
