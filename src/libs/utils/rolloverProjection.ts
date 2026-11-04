/**
 * Mô phỏng đáo hạn thẻ theo từng kỳ (dùng cho tab Phân tích và trang Hành trình).
 * Mỗi kỳ: tự trả x → dịch vụ ứng phần còn lại A → phí = A × r → nợ mới = A + phí (hoặc A nếu phí trả riêng).
 */

export interface IRolloverProjectionInput {
    /** Dư nợ bắt đầu mô phỏng */
    debt: number;
    /** % phí mỗi lần (VD 1.8) */
    feePercent: number;
    /** Tự trả thêm mỗi kỳ (x) */
    extraPayment?: number;
    /** true: phí cộng vào nợ (quẹt lại gồm phí); false: phí trả riêng bằng tiền mặt */
    feeAddedToDebt?: boolean;
    /** Mốc "hòa gốc": phí tích lũy đạt số này. Mặc định = debt */
    baseAmount?: number;
    /** Phí/tự trả đã phát sinh trước đó (để nối tiếp hành trình thật) */
    startCumulativeFee?: number;
    startCumulativePaid?: number;
    maxPeriods?: number;
}

export interface IRolloverProjectionRow {
    period: number;
    paid: number;
    fee: number;
    debtAfter: number;
    cumulativeFee: number;
    cumulativePaid: number;
}

export interface IRolloverProjectionResult {
    rows: IRolloverProjectionRow[];
    /** Kỳ mà phí tích lũy ≥ gốc; null nếu không chạm trong maxPeriods */
    breakEvenPeriod: number | null;
    /** Kỳ nợ về 0 nhờ tự trả; null nếu không */
    debtFreePeriod: number | null;
    totalFee: number;
    totalPaid: number;
    /** Phí mỗi kỳ ở kỳ đầu, để so x với phí */
    firstFee: number;
}

const DEFAULT_MAX_PERIODS = 600;

export function projectRollovers(input: IRolloverProjectionInput): IRolloverProjectionResult {
    const rate = Math.max(0, input.feePercent) / 100;
    const extra = Math.max(0, input.extraPayment ?? 0);
    const addFee = input.feeAddedToDebt ?? true;
    const base = input.baseAmount ?? input.debt;
    const maxPeriods = input.maxPeriods ?? DEFAULT_MAX_PERIODS;

    const rows: IRolloverProjectionRow[] = [];
    let debt = Math.max(0, input.debt);
    let cumulativeFee = input.startCumulativeFee ?? 0;
    let cumulativePaid = input.startCumulativePaid ?? 0;
    let breakEvenPeriod: number | null = null;
    let debtFreePeriod: number | null = null;
    const firstFee = Math.round(Math.max(0, debt - extra) * rate);

    for (let period = 1; period <= maxPeriods && debt > 0; period++) {
        const paid = Math.min(extra, debt);
        const advanced = debt - paid;
        const fee = Math.round(advanced * rate);
        cumulativeFee += fee;
        cumulativePaid += paid;
        debt = advanced > 0 ? (addFee ? advanced + fee : advanced) : 0;
        rows.push({ period, paid, fee, debtAfter: debt, cumulativeFee, cumulativePaid });
        if (breakEvenPeriod == null && base > 0 && cumulativeFee >= base) breakEvenPeriod = period;
        if (debt === 0) {
            debtFreePeriod = period;
            break;
        }
        // Không trả thêm thì nợ không bao giờ hết: dừng sau mốc hòa gốc vài kỳ cho bảng gọn
        if (extra <= 0 && breakEvenPeriod != null && period >= breakEvenPeriod + 2) break;
        // Có trả thêm nhưng không đủ bù phí: nợ chỉ tăng, dừng sớm
        if (rate > 0 && extra > 0 && extra <= firstFee && period >= 24) break;
    }

    return {
        rows,
        breakEvenPeriod,
        debtFreePeriod,
        totalFee: cumulativeFee,
        totalPaid: cumulativePaid,
        firstFee,
    };
}

/** Số kỳ để phí tích lũy bằng gốc khi không trả thêm (công thức đóng). */
export function breakEvenPeriods(feePercent: number, feeAddedToDebt = true) {
    const rate = feePercent / 100;
    if (rate <= 0) return null;
    return feeAddedToDebt ? Math.ceil(Math.log(2) / Math.log(1 + rate)) : Math.ceil(1 / rate);
}

/** Tự trả tối thiểu mỗi kỳ để nợ bắt đầu giảm (lớn hơn phí kỳ đầu). */
export function minPaymentToReduce(debt: number, feePercent: number) {
    return Math.round((debt * feePercent) / 100) + 1;
}

/**
 * Tự trả mỗi kỳ cần để sạch nợ trong đúng `periods` kỳ (tìm bằng chia đôi trên mô phỏng).
 * Trả về số tiền và tổng phí phải chịu thêm.
 */
export function paymentToFinishIn(debt: number, feePercent: number, periods: number, feeAddedToDebt = true) {
    if (debt <= 0 || periods <= 0) return { payment: 0, totalFee: 0 };
    let low = 0;
    let high = debt;
    for (let i = 0; i < 40; i++) {
        const mid = (low + high) / 2;
        const result = projectRollovers({ debt, feePercent, extraPayment: mid, feeAddedToDebt, maxPeriods: periods });
        if (result.debtFreePeriod != null && result.debtFreePeriod <= periods) high = mid;
        else low = mid;
    }
    const payment = Math.ceil(high / 1000) * 1000;
    const result = projectRollovers({ debt, feePercent, extraPayment: payment, feeAddedToDebt, maxPeriods: periods });
    return { payment, totalFee: result.totalFee };
}

/** Lãi đơn khi trả tối thiểu và giữ nguyên dư nợ trong `days` ngày (so sánh với đáo hạn). */
export function interestIfCarried(debt: number, ratePerYear: number, days: number) {
    return Math.round((debt * ratePerYear * days) / 100 / 365);
}
