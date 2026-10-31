import {
    ForeignFeeType,
    type ICreditDetails,
} from "@/libs/interfaces/sourcesOfMoneyData";

/** Phí theo % có mức tối thiểu: max(round(amount × percent / 100), min). */
export function calcPercentFee(amount: number, percent = 0, min = 0) {
    if (!(amount > 0) || (!percent && !min)) return 0;
    return Math.max(Math.round((amount * percent) / 100), min);
}

/** Cấu hình phí giao dịch quốc tế của thẻ; null nếu thẻ chưa cấu hình loại này. */
export function getForeignFeeConfig(
    details: Partial<ICreditDetails> | undefined,
    type: ForeignFeeType,
) {
    const percent =
        type === ForeignFeeType.FX ? details?.foreignFxFeePercent : details?.foreignVndFeePercent;
    const min = type === ForeignFeeType.FX ? details?.foreignFxFeeMin : details?.foreignVndFeeMin;
    if (percent == null && min == null) return null;
    return { percent: percent ?? 0, min: min ?? 0 };
}

/** Lãi ước tính trong `days` ngày trên `debt` với lãi suất `ratePerYear` %/năm (năm 365 ngày). */
export function estimateInterest(debt: number, ratePerYear: number, days = 30) {
    return Math.round((debt * ratePerYear * days) / 100 / 365);
}
