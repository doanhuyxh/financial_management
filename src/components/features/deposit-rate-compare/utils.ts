import {
    DEFAULT_DEPOSIT_AMOUNT,
    DEFAULT_DEPOSIT_TERM,
    DEPOSIT_TERMS,
    DepositRateOrigin,
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

export const formatRate = (value: number) =>
    `${value.toLocaleString("vi-VN", { minimumFractionDigits: 1, maximumFractionDigits: 2 })}%`;

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

/**
 * Một lựa chọn gửi trên trang: một bảng lãi suất, hoặc nhiều sản phẩm tự lấy của cùng ngân hàng
 * có lãi suất bằng nhau ở mọi kỳ hạn cùng có (VD Vietcombank tại quầy và online) được gộp làm một.
 */
export interface IDepositOption {
    id: string;
    tables: IDepositRateTableData[];
    bankCode: string;
    bankName: string;
    /** Tên sản phẩm; gộp nhiều sản phẩm thì nối bằng " · " */
    product: string;
    isManual: boolean;
    /** %/năm theo kỳ hạn (tháng), áp dụng cho số tiền đang nhập */
    rates: Map<number, number>;
    /** Kỳ hạn chỉ có ở một phần sản phẩm đã gộp → tên các sản phẩm có kỳ hạn đó */
    onlyIn: Map<number, string>;
}

function ratesForAmount(table: IDepositRateTableData, amount: number) {
    const rates = new Map<number, number>();
    for (const term of DEPOSIT_TERMS) {
        const rate = getRate(table, amount, term);
        if (rate != null) rates.set(term, rate);
    }
    return rates;
}

/** Gộp được khi có ít nhất một kỳ hạn chung và mọi kỳ hạn chung có cùng lãi suất. */
function sameRates(a: Map<number, number>, b: Map<number, number>) {
    let shared = 0;
    for (const [term, rate] of a) {
        if (!b.has(term)) continue;
        if (b.get(term) !== rate) return false;
        shared += 1;
    }
    return shared > 0;
}

/** Bảng → lựa chọn gửi, gộp sản phẩm tự lấy trùng lãi suất của cùng ngân hàng. Bảng tự nhập không gộp. */
export function buildDepositOptions(tables: IDepositRateTableData[], amount: number): IDepositOption[] {
    const groups: { tables: IDepositRateTableData[]; rates: Map<number, number>[] }[] = [];
    for (const table of tables) {
        const rates = ratesForAmount(table, amount);
        const group =
            table.origin === DepositRateOrigin.AUTO
                ? groups.find(
                      (item) =>
                          item.tables[0].origin === DepositRateOrigin.AUTO &&
                          item.tables[0].bankCode === table.bankCode &&
                          item.rates.every((other) => sameRates(other, rates)),
                  )
                : undefined;
        if (group) {
            group.tables.push(table);
            group.rates.push(rates);
        } else {
            groups.push({ tables: [table], rates: [rates] });
        }
    }

    return groups.map(({ tables: members, rates: memberRates }) => {
        const rates = new Map<number, number>();
        const onlyIn = new Map<number, string>();
        for (const term of DEPOSIT_TERMS) {
            const having = members.filter((_, index) => memberRates[index].has(term));
            if (having.length === 0) continue;
            rates.set(term, memberRates[members.indexOf(having[0])].get(term)!);
            if (having.length < members.length) {
                onlyIn.set(term, having.map((table) => table.product).join(", "));
            }
        }
        return {
            id: members.map((table) => table._id).join("+"),
            tables: members,
            bankCode: members[0].bankCode,
            bankName: members[0].bankName,
            product: members.map((table) => table.product).filter(Boolean).join(" · "),
            isManual: members[0].origin === DepositRateOrigin.MANUAL,
            rates,
            onlyIn,
        };
    });
}

export interface IDepositRow {
    option: IDepositOption;
    rate: number | null;
    interest: number | null;
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

/** Xếp hạng theo kỳ hạn đang chọn: lãi cao trước, lựa chọn không có kỳ hạn này xuống cuối. */
export function buildDepositRows(options: IDepositOption[], scenario: IDepositScenario): IDepositRow[] {
    return options
        .map((option) => {
            const rate = option.rates.get(scenario.termMonths) ?? null;
            return {
                option,
                rate,
                interest: rate == null ? null : calcDepositInterest(scenario.amount, rate, scenario.termMonths),
            };
        })
        .sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1));
}

/** Kỳ hạn hiện trên trang: kỳ hạn chuẩn có ít nhất một ngân hàng có số liệu. */
export function getAvailableTerms(tables: IDepositRateTableData[]) {
    return DEPOSIT_TERMS.filter((term) =>
        tables.some((table) => table.tiers.some((tier) => tier.rates[String(term)] != null)),
    );
}

/** Bảng có số liệu để so sánh (bảng tự động lỗi ngay lần đầu thì chưa có bậc nào). */
export function hasRates(table: IDepositRateTableData) {
    return table.tiers.some((tier) => Object.keys(tier.rates).length > 0);
}
