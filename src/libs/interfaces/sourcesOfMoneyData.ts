import { IDefaultQuery } from "./DefaultQuery";

export enum SourcesOfMoneyType {
    BANK = "BANK",
    CASH = "CASH",
    CREDIT_CARD = "CREDIT_CARD",
    E_WALLET = "E_WALLET",
    OTHER = "OTHER",
}

/** Kỳ tính chi tiêu tối thiểu để được miễn phí thường niên. */
export enum AnnualFeeWaiverPeriod {
    /** Tổng chi tiêu trong năm thẻ (12 tháng trước ngày thu phí kế tiếp) */
    YEAR = "YEAR",
    /** Chi tiêu mỗi kỳ sao kê (tháng dương lịch nếu thẻ chưa đặt ngày sao kê) */
    MONTH = "MONTH",
}

export const ANNUAL_FEE_WAIVER_PERIOD_LABELS: Record<AnnualFeeWaiverPeriod, string> = {
    [AnnualFeeWaiverPeriod.YEAR]: "Theo năm",
    [AnnualFeeWaiverPeriod.MONTH]: "Theo kỳ sao kê",
};

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
    /** Miễn phí thường niên khi chi tiêu đạt `annualFeeWaiverMinSpend` trong kỳ */
    annualFeeWaiverPeriod?: AnnualFeeWaiverPeriod;
    annualFeeWaiverMinSpend?: number;
    /** Phí quản lý ước tính mỗi tháng, thu vào ngày `managementFeeDay` (1–31) */
    managementFee?: number;
    managementFeeDay?: number;
    /**
     * Miễn phí quản lý khi trong kỳ sao kê đạt **một trong hai**: ít nhất n giao dịch chi tiêu
     * hoặc tổng chi tiêu ít nhất `managementFeeWaiverMinSpend`.
     */
    managementFeeWaiverMinTransactions?: number;
    managementFeeWaiverMinSpend?: number;
    /** Phí mỗi lần trả nợ thẻ vượt quá `freePaymentsPerCycle` lần miễn phí trong kỳ sao kê */
    paymentFee?: number;
    freePaymentsPerCycle?: number;
    /** Phí cố định mỗi kỳ sao kê, chỉ thu khi kỳ đó có ít nhất một giao dịch chi tiêu (VD: MoMo) */
    usageFee?: number;
    /** Lãi suất %/năm trên dư nợ khi không trả đủ (rút tiền mặt bị tính ngay từ ngày rút) */
    interestRate?: number;
    /** Phí rút tiền mặt: max(% × số tiền, tối thiểu); áp dụng khi chuyển tiền có phí từ thẻ */
    cashAdvanceFeePercent?: number;
    cashAdvanceFeeMin?: number;
    /** Phí giao dịch ngoại tệ: max(% × số tiền, tối thiểu) */
    foreignFxFeePercent?: number;
    foreignFxFeeMin?: number;
    /** Phí giao dịch VND tại đơn vị thanh toán nước ngoài: max(% × số tiền, tối thiểu) */
    foreignVndFeePercent?: number;
    foreignVndFeeMin?: number;
    /** Phí chậm thanh toán: %/ngày trên số tiền tối thiểu chưa trả, kẹp trong [min, max] */
    lateFeePercentPerDay?: number;
    lateFeeMin?: number;
    lateFeeMax?: number;
}

/** Loại giao dịch quốc tế trên thẻ, quyết định cách tính phí. */
export enum ForeignFeeType {
    /** Giao dịch bằng ngoại tệ */
    FX = "FX",
    /** Giao dịch VND tại đơn vị thanh toán nước ngoài */
    INTL_VND = "INTL_VND",
}

export const FOREIGN_FEE_TYPE_LABELS: Record<ForeignFeeType, string> = {
    [ForeignFeeType.FX]: "Giao dịch ngoại tệ",
    [ForeignFeeType.INTL_VND]: "VND tại đơn vị nước ngoài",
};

/** Tiến độ điều kiện miễn phí của một thẻ (chi tiêu không gồm phí thẻ và phí chuyển tiền). */
export interface ICreditCardFeeProgress {
    sourceOfMoneyId: string;
    /** Kỳ sao kê hiện tại [cycleStart, cycleEnd) */
    cycleStart: string;
    cycleEnd: string;
    cycleSpend: number;
    cycleTransactions: number;
    /** Số lần trả nợ thẻ trong kỳ (chuyển tiền vào thẻ + thu nhập vào thẻ) */
    cyclePayments: number;
    /** Chi tiêu trong năm thẻ [yearStart, yearEnd) */
    yearSpend: number;
    yearStart: string;
    yearEnd: string;
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
