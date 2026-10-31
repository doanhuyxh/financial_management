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
    /** Phí thường niên ước tính; số thực tế ghi bằng một khoản chi tiêu trên thẻ */
    annualFee?: number;
    /** Ngày (1–31) và tháng (1–12) thu phí thường niên, lặp lại mỗi năm */
    annualFeeDay?: number;
    annualFeeMonth?: number;
}

/** Tài khoản nhận tiền của nguồn loại BANK, dùng để tạo mã VietQR. */
export interface IBankAccount {
    /** Mã BIN 6 số của ngân hàng theo NAPAS (VD: 970415) */
    bin: string;
    /** Tên ngắn của ngân hàng, lưu kèm để hiển thị không cần gọi API danh sách ngân hàng */
    bankName: string;
    accountNumber: string;
    /** Tên chủ tài khoản: in hoa, không dấu */
    accountName?: string;
}

/** Một ngân hàng trong danh sách của api.vietqr.io/v2/banks (chỉ các trường dùng tới). */
export interface IVietQrBank {
    id: number;
    name: string;
    code: string;
    bin: string;
    shortName: string;
    logo: string;
}

export interface ISourcesOfMoneyData {
    _id: string;
    name: string;
    type: SourcesOfMoneyType;
    balance: number;
    sortOrder: number;
    creditDetails?: ICreditDetails;
    bankAccount?: IBankAccount;
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
    /** Chỉ lưu với loại BANK; bỏ trống hoặc loại khác thì xóa */
    bankAccount?: IBankAccount | null;
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
