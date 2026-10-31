import {
    AnnualFeeWaiverPeriod,
    SourcesOfMoneyType,
    type ICreditDetails,
    type ISourcesOfMoneyData,
} from "@/libs/interfaces/sourcesOfMoneyData";
import { calcPercentFee, estimateInterest } from "@/libs/utils/cardFee";
import { formatMoney } from "@/libs/utils/formatMoney";

/** Cách dùng thẻ giả định để quy các mức phí ra số tiền. */
export interface ICompareScenario {
    /** Chi tiêu mỗi tháng (mỗi kỳ sao kê) */
    monthlySpend: number;
    monthlyTransactions: number;
    /** Số lần trả nợ thẻ mỗi kỳ */
    paymentsPerCycle: number;
    /** Một lần rút tiền mặt */
    cashAdvanceAmount: number;
    /** Một lần chi tiêu bằng ngoại tệ / tại đơn vị nước ngoài */
    foreignAmount: number;
    /** Dư nợ chưa trả hết, tính lãi trong 30 ngày */
    carriedDebt: number;
}

export const DEFAULT_SCENARIO: ICompareScenario = {
    monthlySpend: 5_000_000,
    monthlyTransactions: 10,
    paymentsPerCycle: 1,
    cashAdvanceAmount: 1_000_000,
    foreignAmount: 1_000_000,
    carriedDebt: 1_000_000,
};

/** Một khoản phí cố định trong năm và lý do được miễn (nếu có). */
export interface IYearlyFee {
    amount: number;
    /** Có phí nhưng được miễn theo kịch bản */
    waived: boolean;
    /** Mô tả điều kiện miễn, null nếu thẻ không có điều kiện */
    condition: string | null;
}

export interface ICardMetrics {
    _id: string;
    name: string;
    creditLimit: number;
    available: number;
    annualFee: IYearlyFee;
    managementFee: IYearlyFee;
    paymentFeeYear: number;
    /** Tổng phí cố định một năm theo kịch bản (thường niên + quản lý + thanh toán) */
    fixedYear: number;
    interestRate: number | null;
    /** Lãi 30 ngày trên `carriedDebt`; null nếu thẻ chưa nhập lãi suất */
    interestCost: number | null;
    /** Phí + lãi 30 ngày cho một lần rút `cashAdvanceAmount`; null nếu chưa nhập phí rút */
    cashAdvanceFee: number | null;
    cashAdvanceInterest: number | null;
    cashAdvanceTotal: number | null;
    foreignFxFee: number | null;
    foreignVndFee: number | null;
    lateFeeMin: number | null;
    /** Các nhóm phí/lãi chưa nhập, nên kết quả so sánh có thể chưa đủ */
    missing: string[];
}

function percentFeeOrNull(amount: number, percent?: number, min?: number) {
    if (percent == null && min == null) return null;
    return calcPercentFee(amount, percent, min);
}

/**
 * Phí thường niên, phí quản lý và phí thanh toán bỏ trống được coi là 0 (thẻ không có
 * loại phí đó). Lãi suất và phí theo % bỏ trống là "chưa biết" và không được xếp hạng.
 */
export function buildCardMetrics(
    source: ISourcesOfMoneyData,
    scenario: ICompareScenario,
): ICardMetrics {
    const details: Partial<ICreditDetails> = source.creditDetails ?? {};
    const creditLimit = details.creditLimit ?? 0;
    const spend = scenario.monthlySpend;

    // Phí thường niên
    const annualRaw = details.annualFee ?? 0;
    let annualCondition: string | null = null;
    let annualWaived = false;
    if (details.annualFeeWaiverPeriod && details.annualFeeWaiverMinSpend) {
        const isYear = details.annualFeeWaiverPeriod === AnnualFeeWaiverPeriod.YEAR;
        annualCondition = `Miễn nếu chi ≥ ${formatMoney(details.annualFeeWaiverMinSpend)}/${isYear ? "năm" : "kỳ"}`;
        annualWaived = (isYear ? spend * 12 : spend) >= details.annualFeeWaiverMinSpend;
    }
    annualWaived = annualWaived && annualRaw > 0;

    // Phí quản lý
    const managementMonthly = details.managementFee ?? 0;
    const managementConditions = [
        details.managementFeeWaiverMinTransactions
            ? `≥ ${details.managementFeeWaiverMinTransactions} giao dịch`
            : null,
        details.managementFeeWaiverMinSpend
            ? `chi ≥ ${formatMoney(details.managementFeeWaiverMinSpend)}`
            : null,
    ].filter(Boolean);
    const managementWaived =
        managementMonthly > 0 &&
        ((details.managementFeeWaiverMinTransactions != null &&
            scenario.monthlyTransactions >= details.managementFeeWaiverMinTransactions) ||
            (details.managementFeeWaiverMinSpend != null &&
                spend >= details.managementFeeWaiverMinSpend));

    const paymentFeeYear =
        details.paymentFee != null
            ? Math.max(0, scenario.paymentsPerCycle - (details.freePaymentsPerCycle ?? 0)) *
              details.paymentFee *
              12
            : 0;

    const annualFee: IYearlyFee = {
        amount: annualWaived ? 0 : annualRaw,
        waived: annualWaived,
        condition: annualCondition,
    };
    const managementFee: IYearlyFee = {
        amount: managementWaived ? 0 : managementMonthly * 12,
        waived: managementWaived,
        condition:
            managementConditions.length > 0
                ? `Miễn nếu ${managementConditions.join(" hoặc ")}/kỳ`
                : null,
    };

    const interestRate = details.interestRate ?? null;
    const cashAdvanceFee = percentFeeOrNull(
        scenario.cashAdvanceAmount,
        details.cashAdvanceFeePercent,
        details.cashAdvanceFeeMin,
    );
    // Rút tiền mặt bị tính lãi ngay từ ngày rút
    const cashAdvanceInterest =
        interestRate != null ? estimateInterest(scenario.cashAdvanceAmount, interestRate) : null;

    const missing = [
        interestRate == null ? "lãi suất" : null,
        cashAdvanceFee == null ? "phí rút tiền mặt" : null,
        details.foreignFxFeePercent == null && details.foreignFxFeeMin == null
            ? "phí ngoại tệ"
            : null,
        details.lateFeeMin == null && details.lateFeePercentPerDay == null
            ? "phí chậm trả"
            : null,
    ].filter((item): item is string => Boolean(item));

    return {
        _id: source._id,
        name: source.name,
        creditLimit,
        available: Math.max(0, creditLimit - (details.currentDebt ?? 0)),
        annualFee,
        managementFee,
        paymentFeeYear,
        fixedYear: annualFee.amount + managementFee.amount + paymentFeeYear,
        interestRate,
        interestCost:
            interestRate != null ? estimateInterest(scenario.carriedDebt, interestRate) : null,
        cashAdvanceFee,
        cashAdvanceInterest,
        cashAdvanceTotal:
            cashAdvanceFee != null ? cashAdvanceFee + (cashAdvanceInterest ?? 0) : null,
        foreignFxFee: percentFeeOrNull(
            scenario.foreignAmount,
            details.foreignFxFeePercent,
            details.foreignFxFeeMin,
        ),
        foreignVndFee: percentFeeOrNull(
            scenario.foreignAmount,
            details.foreignVndFeePercent,
            details.foreignVndFeeMin,
        ),
        lateFeeMin: details.lateFeeMin ?? null,
        missing,
    };
}

export function getCreditCards(sources: ISourcesOfMoneyData[]) {
    return sources.filter((source) => source.type === SourcesOfMoneyType.CREDIT_CARD);
}

/** Tiêu chí so sánh: `value` dùng để xếp hạng (null = chưa biết, không xếp hạng). */
export interface ICompareCriterion {
    key: string;
    label: string;
    /** Tên ngắn dùng trong điểm mạnh/yếu */
    short: string;
    hint?: string;
    higherIsBetter?: boolean;
    value: (metrics: ICardMetrics) => number | null;
}

export const COMPARE_CRITERIA: ICompareCriterion[] = [
    {
        key: "available",
        label: "Hạn mức còn lại",
        short: "hạn mức còn lại",
        higherIsBetter: true,
        value: (m) => m.available,
    },
    {
        key: "fixedYear",
        label: "Phí cố định/năm",
        short: "phí cố định/năm",
        hint: "Thường niên + quản lý + thanh toán dư nợ, theo kịch bản (đã trừ phần được miễn)",
        value: (m) => m.fixedYear,
    },
    {
        key: "annualFee",
        label: "Phí thường niên",
        short: "phí thường niên",
        value: (m) => m.annualFee.amount,
    },
    {
        key: "managementFee",
        label: "Phí quản lý/năm",
        short: "phí quản lý",
        value: (m) => m.managementFee.amount,
    },
    {
        key: "paymentFee",
        label: "Phí thanh toán dư nợ/năm",
        short: "phí trả nợ",
        value: (m) => m.paymentFeeYear,
    },
    {
        key: "interest",
        label: "Lãi khi chưa trả hết (30 ngày)",
        short: "lãi suất",
        value: (m) => m.interestCost,
    },
    {
        key: "cashAdvance",
        label: "Rút tiền mặt (phí + lãi 30 ngày)",
        short: "rút tiền mặt",
        value: (m) => m.cashAdvanceTotal,
    },
    {
        key: "foreignFx",
        label: "Chi tiêu ngoại tệ",
        short: "chi tiêu ngoại tệ",
        value: (m) => m.foreignFxFee,
    },
    {
        key: "foreignVnd",
        label: "VND tại ĐV nước ngoài",
        short: "thanh toán VND ở ĐV nước ngoài",
        value: (m) => m.foreignVndFee,
    },
    {
        key: "lateFee",
        label: "Phí chậm trả tối thiểu",
        short: "phí chậm trả",
        value: (m) => m.lateFeeMin,
    },
];

export type RankResult = "best" | "worst" | null;

/**
 * Xếp hạng một tiêu chí: thẻ tốt nhất/tệ nhất trong số thẻ có giá trị.
 * Không đánh dấu khi chưa đủ 2 thẻ có giá trị hoặc mọi thẻ bằng nhau.
 */
export function rankCriterion(
    criterion: ICompareCriterion,
    cards: ICardMetrics[],
): Map<string, RankResult> {
    const result = new Map<string, RankResult>();
    const valued = cards
        .map((card) => ({ id: card._id, value: criterion.value(card) }))
        .filter((item): item is { id: string; value: number } => item.value != null);
    if (valued.length < 2) return result;

    const values = valued.map((item) => item.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (min === max) return result;

    const best = criterion.higherIsBetter ? max : min;
    const worst = criterion.higherIsBetter ? min : max;
    for (const item of valued) {
        if (item.value === best) result.set(item.id, "best");
        else if (item.value === worst) result.set(item.id, "worst");
    }
    return result;
}

export interface ICardVerdict {
    strengths: string[];
    weaknesses: string[];
}

export function buildVerdicts(cards: ICardMetrics[]): Map<string, ICardVerdict> {
    const verdicts = new Map<string, ICardVerdict>(
        cards.map((card) => [card._id, { strengths: [], weaknesses: [] }]),
    );
    // Hai thẻ thì nói "hơn", từ ba thẻ trở lên mới nói "nhất"
    const degree = cards.length > 2 ? "nhất" : "hơn";
    for (const criterion of COMPARE_CRITERIA) {
        const ranks = rankCriterion(criterion, cards);
        for (const [id, rank] of ranks) {
            const verdict = verdicts.get(id);
            if (!verdict || !rank) continue;
            const text = criterion.higherIsBetter
                ? `${criterion.short} ${rank === "best" ? "cao" : "thấp"} ${degree}`
                : `${rank === "best" ? "Rẻ" : "Đắt"} ${degree} về ${criterion.short}`;
            (rank === "best" ? verdict.strengths : verdict.weaknesses).push(
                text.charAt(0).toUpperCase() + text.slice(1),
            );
        }
    }
    return verdicts;
}

export interface IBestPick {
    key: string;
    title: string;
    description: string;
    card: ICardMetrics | null;
    value: number | null;
}

/** Thẻ nên dùng cho từng nhu cầu: thẻ có chi phí thấp nhất theo kịch bản. */
export function buildBestPicks(cards: ICardMetrics[], scenario: ICompareScenario): IBestPick[] {
    const pick = (value: (m: ICardMetrics) => number | null) => {
        let best: ICardMetrics | null = null;
        let bestValue: number | null = null;
        for (const card of cards) {
            const current = value(card);
            if (current == null) continue;
            if (bestValue == null || current < bestValue) {
                best = card;
                bestValue = current;
            }
        }
        return { card: best, value: bestValue };
    };

    return [
        {
            key: "daily",
            title: "Chi tiêu hằng ngày",
            description: `Phí cố định/năm khi chi ${formatMoney(scenario.monthlySpend)}/tháng`,
            ...pick((m) => m.fixedYear),
        },
        {
            key: "debt",
            title: "Khi chưa trả hết dư nợ",
            description: `Lãi 30 ngày trên ${formatMoney(scenario.carriedDebt)}`,
            ...pick((m) => m.interestCost),
        },
        {
            key: "cash",
            title: "Rút tiền mặt",
            description: `Phí + lãi 30 ngày khi rút ${formatMoney(scenario.cashAdvanceAmount)}`,
            ...pick((m) => m.cashAdvanceTotal),
        },
        {
            key: "foreign",
            title: "Chi tiêu ngoại tệ",
            description: `Phí cho giao dịch ${formatMoney(scenario.foreignAmount)}`,
            ...pick((m) => m.foreignFxFee),
        },
    ];
}
