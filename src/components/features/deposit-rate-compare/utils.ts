import {
    DEFAULT_DEPOSIT_AMOUNT,
    DEFAULT_DEPOSIT_TERM,
    DEPOSIT_TERMS,
    type IDepositRateTableData,
    type IDepositRateTier,
} from "@/libs/interfaces/depositRatesData";

/** Nghiệp vụ: .agents/business/deposit-rate-compare.md */

export interface IDepositScenario {
    amount: number;
    termMonths: number;
}

export const DEFAULT_DEPOSIT_SCENARIO: IDepositScenario = {
    amount: DEFAULT_DEPOSIT_AMOUNT,
    termMonths: DEFAULT_DEPOSIT_TERM,
};

export type RankResult = "best" | "worst";

/** Bậc áp dụng cho số tiền gửi: bậc có `minAmount` lớn nhất mà vẫn ≤ số tiền. */
export function pickTier(tiers: IDepositRateTier[], amount: number): IDepositRateTier | null {
    let picked: IDepositRateTier | null = null;
    for (const tier of tiers) {
        if (tier.minAmount <= amount && (!picked || tier.minAmount >= picked.minAmount)) picked = tier;
    }
    return picked;
}

/** Lãi suất %/năm của bảng cho số tiền và kỳ hạn; ngân hàng không có kỳ hạn đó → null. */
export function getRate(table: IDepositRateTableData, amount: number, termMonths: number) {
    const rate = pickTier(table.tiers, amount)?.rates[String(termMonths)];
    return typeof rate === "number" ? rate : null;
}

/**
 * Tiền lãi cuối kỳ (lãi đơn, không tái tục): số tiền × lãi suất/năm × số tháng / 12, làm tròn VND.
 * Ngân hàng tính theo số ngày thực tế/365 nên chênh vài nghìn đồng — đủ để so sánh.
 */
export function calcDepositInterest(amount: number, ratePercent: number, termMonths: number) {
    return Math.round((amount * ratePercent * termMonths) / 100 / 12);
}

export interface IDepositRow {
    table: IDepositRateTableData;
    rate: number | null;
    interest: number | null;
    rank?: RankResult;
}

/** Cao nhất là tốt; cần ≥ 2 giá trị khác nhau mới xếp hạng (giống so sánh thẻ). */
export function rankValues<T extends { id: string; value: number | null }>(items: T[]) {
    const result = new Map<string, RankResult>();
    const values = items.flatMap((item) => (item.value == null ? [] : [item.value]));
    if (values.length < 2) return result;
    const max = Math.max(...values);
    const min = Math.min(...values);
    if (max === min) return result;
    for (const item of items) {
        if (item.value === max) result.set(item.id, "best");
        else if (item.value === min) result.set(item.id, "worst");
    }
    return result;
}

/** Bảng xếp hạng theo kỳ hạn đang chọn: lãi cao trước, ngân hàng không có kỳ hạn này xuống cuối. */
export function buildDepositRows(tables: IDepositRateTableData[], scenario: IDepositScenario): IDepositRow[] {
    const rows = tables.map((table) => {
        const rate = getRate(table, scenario.amount, scenario.termMonths);
        return {
            table,
            rate,
            interest: rate == null ? null : calcDepositInterest(scenario.amount, rate, scenario.termMonths),
        };
    });
    const ranks = rankValues(rows.map((row) => ({ id: row.table._id, value: row.rate })));
    return rows
        .map((row) => ({ ...row, rank: ranks.get(row.table._id) }))
        .sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1));
}

/** Kỳ hạn hiện trong bảng tổng hợp: kỳ hạn chuẩn có ít nhất một ngân hàng có số liệu. */
export function getAvailableTerms(tables: IDepositRateTableData[]) {
    return DEPOSIT_TERMS.filter((term) =>
        tables.some((table) => table.tiers.some((tier) => tier.rates[String(term)] != null)),
    );
}

/** Bảng có số liệu để so sánh (bảng tự động lỗi ngay lần đầu thì chưa có bậc nào). */
export function hasRates(table: IDepositRateTableData) {
    return table.tiers.some((tier) => Object.keys(tier.rates).length > 0);
}
