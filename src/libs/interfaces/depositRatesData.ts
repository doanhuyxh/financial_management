/** So sánh lãi suất gửi tiết kiệm. Nghiệp vụ: .agents/business/deposit-rate-compare.md */

export enum DepositRateOrigin {
    /** Server tự lấy từ trang chính thức của ngân hàng (dữ liệu công khai, dùng chung mọi user) */
    AUTO = "AUTO",
    /** User tự nhập */
    MANUAL = "MANUAL",
}

/** Kỳ hạn (tháng) hiện trên trang và trong form nhập tay. */
export const DEPOSIT_TERMS = [1, 3, 6, 9, 12, 13, 18, 24, 36] as const;
export const DEFAULT_DEPOSIT_TERM = 12;
export const DEFAULT_DEPOSIT_AMOUNT = 100_000_000;
/** Lãi suất hợp lệ (%/năm) — ngoài khoảng này coi như đọc sai. */
export const MAX_DEPOSIT_RATE_PERCENT = 20;
export const DEPOSIT_PRODUCT_MAX_LENGTH = 60;

/**
 * Lãi suất theo kỳ hạn cho các khoản gửi từ `minAmount` trở lên.
 * `rates`: key là số tháng (chuỗi), giá trị %/năm (VD `{ "12": 5.4 }`).
 */
export interface IDepositRateTier {
    minAmount: number;
    rates: Record<string, number>;
}

export interface IDepositRateTableData {
    _id: string;
    origin: DepositRateOrigin;
    /** Mã ngân hàng theo VietQR (`code`, VD "VCB") để lấy logo/tên */
    bankCode: string;
    bankName: string;
    /** Sản phẩm / kênh gửi, VD "Gửi online", "Tại quầy" */
    product: string;
    sourceUrl?: string | null;
    /** Tăng dần theo `minAmount`; bậc đầu luôn `minAmount = 0` */
    tiers: IDepositRateTier[];
    /** AUTO: lần lấy thành công gần nhất; MANUAL: lần sửa cuối */
    updatedAt: string;
    /** AUTO: lần lấy gần nhất bị lỗi, đang hiện số cũ */
    lastError?: string | null;
}

export interface IDepositRateComparisonData {
    tables: IDepositRateTableData[];
}

export interface IFromDepositRateData {
    bankCode: string;
    bankName: string;
    product: string;
    /** %/năm theo kỳ hạn (tháng); bỏ trống kỳ hạn nào thì không gửi kỳ hạn đó */
    rates: { termMonths: number; rate: number }[];
}

export interface IDepositRateRefreshData {
    /** Số bảng lấy được / tổng số nguồn tự động */
    succeeded: number;
    total: number;
}
