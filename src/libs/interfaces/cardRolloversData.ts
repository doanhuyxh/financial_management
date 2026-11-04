import { IDefaultQuery } from "./DefaultQuery";

export interface ICardRolloverSourceRef {
    _id: string;
    name: string;
    archivedAt?: string | null;
}

export interface ICardRolloverCategoryRef {
    _id: string;
    name: string;
    archivedAt?: string | null;
}

/** Khoản tự trả đi kèm (Transfer thường → thẻ), populate khi liệt kê. */
export interface ICardRolloverPaymentRef {
    _id: string;
    amount: number;
    transferredAt: string;
    fromSourceId?: string | ICardRolloverSourceRef | null;
}

/**
 * Một lần đáo hạn thẻ: bên dịch vụ ứng `amount` trả vào thẻ rồi quẹt lại `amount + feeAmount`.
 * Tiền của người dùng không đổi; dư nợ thẻ chỉ tăng đúng `feeAmount`.
 */
export interface ICardRolloverData {
    _id: string;
    sourceOfMoneyId: string | ICardRolloverSourceRef;
    amount: number;
    feePercent: number;
    feeAmount: number;
    feeCategoryId?: string | ICardRolloverCategoryRef | null;
    feeExpenseId?: string | null;
    /** Khoản tự trả một phần ghi cùng lần đáo (x); null nếu không có */
    paymentTransferId?: string | ICardRolloverPaymentRef | null;
    /** Tên bên dịch vụ đáo hạn (tùy chọn) */
    provider?: string;
    note?: string;
    rolledAt: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface IFromCardRolloverData {
    sourceOfMoneyId: string;
    amount: number;
    /** % phí để lưu lại; bỏ trống = 0 */
    feePercent?: number;
    /** Phí thực tế; bỏ trống thì server tính = round(amount × feePercent / 100) */
    feeAmount?: number;
    /** Bắt buộc khi phí > 0 */
    feeCategoryId?: string;
    /**
     * Tự trả một phần (x): server tạo Transfer `paymentSourceId` → thẻ trước khi ghi đáo hạn,
     * nên `amount` (A) là phần dịch vụ ứng sau khi đã trả x.
     */
    paymentAmount?: number;
    paymentSourceId?: string;
    provider?: string;
    note?: string;
    rolledAt?: string | Date;
}

export interface IPaginatedCardRolloversQuery extends IDefaultQuery {
    sourceOfMoneyId?: string;
    from?: string;
    to?: string;
}
