import dayjs, { type Dayjs } from "dayjs";
import {
    AnnualFeeWaiverPeriod,
    SourcesOfMoneyType,
    type ICreditCardFeeProgress,
    type ICreditDetails,
    type ISourcesOfMoneyData,
} from "@/libs/interfaces/sourcesOfMoneyData";
import { getNextAnnualDate } from "@/libs/utils/annualFeeDate";
import { getStatementCycle } from "@/libs/utils/statementCycle";
import { estimateInterest } from "@/libs/utils/cardFee";

/** Cards due within this many days are flagged as "sắp đến hạn". */
export const DUE_SOON_DAYS = 7;
/** Cards due within this many days are flagged as urgent. */
export const DUE_URGENT_DAYS = 3;

export type CreditDueStatus = "no-due-date" | "today" | "urgent" | "soon" | "normal";

/** Next occurrence of `dueDay` (1–31) from `today`, clamped to the month length. */
export function getNextDueDate(dueDay: number, today: Dayjs = dayjs()): Dayjs {
    const start = today.startOf("day");
    const inMonth = (month: Dayjs) =>
        month.date(Math.min(dueDay, month.daysInMonth()));

    const thisMonth = inMonth(start.startOf("month"));
    if (!thisMonth.isBefore(start, "day")) return thisMonth;
    return inMonth(start.startOf("month").add(1, "month"));
}

function getDueStatus(daysLeft: number | null): CreditDueStatus {
    if (daysLeft == null) return "no-due-date";
    if (daysLeft === 0) return "today";
    if (daysLeft <= DUE_URGENT_DAYS) return "urgent";
    if (daysLeft <= DUE_SOON_DAYS) return "soon";
    return "normal";
}

/** Tiến độ một điều kiện miễn phí: `current` so với mức tối thiểu `target`. */
export interface IFeeWaiverProgress {
    current: number;
    target: number;
    achieved: boolean;
}

/** Miễn phí quản lý khi đạt một trong hai điều kiện trong kỳ sao kê. */
export interface IManagementFeeWaiver {
    transactions: IFeeWaiverProgress | null;
    spend: IFeeWaiverProgress | null;
    achieved: boolean;
}

/** Phí trả nợ thẻ trong kỳ sao kê hiện tại. */
export interface IPaymentFeeStatus {
    fee: number;
    freePayments: number;
    /** null khi chưa tải xong tiến độ */
    payments: number | null;
    /** Tổng phí ước tính đã phát sinh trong kỳ */
    estimatedTotal: number;
    /** Lần trả nợ tiếp theo trong kỳ có bị thu phí không */
    nextPaymentCharged: boolean;
}

/** Phí sử dụng: thu một lần trong kỳ sao kê nếu kỳ đó có chi tiêu. */
export interface IUsageFeeStatus {
    fee: number;
    /** Số giao dịch chi tiêu trong kỳ; null khi chưa tải xong tiến độ */
    transactions: number | null;
    /** Kỳ này đã phát sinh phí (đã có chi tiêu) */
    charged: boolean;
}

/** Lãi và phí chậm thanh toán: chỉ là quy tắc của thẻ, hệ thống không biết kỳ nào đã trả đủ. */
export interface ILatePenalty {
    /** Lãi suất %/năm */
    interestRate: number | null;
    /** Lãi ước tính 30 ngày trên dư nợ hiện tại nếu không trả hết */
    estimatedMonthlyInterest: number | null;
    lateFeePercentPerDay: number | null;
    lateFeeMin: number | null;
    lateFeeMax: number | null;
}

export interface ICreditCardFeeItem {
    _id: string;
    name: string;
    /** Kỳ sao kê hiện tại [cycleStart, cycleEnd) */
    cycleStart: Dayjs;
    cycleEnd: Dayjs;
    /** Phí thường niên ước tính; số thực tế có thể khác khi ngân hàng thu. */
    annualFee: number | null;
    nextAnnualFeeDate: Dayjs | null;
    daysLeft: number | null;
    status: Exclude<CreditDueStatus, "no-due-date"> | null;
    annualFeeWaiverPeriod: AnnualFeeWaiverPeriod | null;
    /** Chi tiêu trong kỳ (năm thẻ hoặc kỳ sao kê) so với mức tối thiểu */
    annualFeeWaiver: IFeeWaiverProgress | null;
    /** Phí quản lý ước tính mỗi kỳ */
    managementFee: number | null;
    managementFeeDay: number | null;
    managementFeeWaiver: IManagementFeeWaiver | null;
    paymentFee: IPaymentFeeStatus | null;
    usageFee: IUsageFeeStatus | null;
    latePenalty: ILatePenalty | null;
}

function toWaiver(current: number | undefined, target: number | undefined) {
    if (current == null || !target) return null;
    return { current, target, achieved: current >= target };
}

function buildManagementWaiver(
    details: Partial<ICreditDetails>,
    progress: ICreditCardFeeProgress | undefined,
): IManagementFeeWaiver | null {
    const transactions = toWaiver(
        progress?.cycleTransactions,
        details.managementFeeWaiverMinTransactions,
    );
    const spend = toWaiver(progress?.cycleSpend, details.managementFeeWaiverMinSpend);
    if (!transactions && !spend) return null;
    return {
        transactions,
        spend,
        achieved: Boolean(transactions?.achieved || spend?.achieved),
    };
}

function buildPaymentFee(
    details: Partial<ICreditDetails>,
    progress: ICreditCardFeeProgress | undefined,
): IPaymentFeeStatus | null {
    if (details.paymentFee == null) return null;
    const freePayments = details.freePaymentsPerCycle ?? 0;
    const payments = progress?.cyclePayments ?? null;
    return {
        fee: details.paymentFee,
        freePayments,
        payments,
        estimatedTotal: Math.max(0, (payments ?? 0) - freePayments) * details.paymentFee,
        nextPaymentCharged: (payments ?? 0) >= freePayments,
    };
}

function buildLatePenalty(details: Partial<ICreditDetails>): ILatePenalty | null {
    const { interestRate, lateFeePercentPerDay, lateFeeMin, lateFeeMax } = details;
    if (interestRate == null && lateFeePercentPerDay == null && lateFeeMin == null) return null;
    const debt = details.currentDebt ?? 0;
    return {
        interestRate: interestRate ?? null,
        estimatedMonthlyInterest:
            interestRate != null && debt > 0 ? estimateInterest(debt, interestRate) : null,
        lateFeePercentPerDay: lateFeePercentPerDay ?? null,
        lateFeeMin: lateFeeMin ?? null,
        lateFeeMax: lateFeeMax ?? null,
    };
}

/**
 * Thẻ có cấu hình phí (thường niên, quản lý, thanh toán dư nợ, phí sử dụng, lãi hoặc phí chậm trả), thẻ sắp thu phí thường niên trước.
 * `progress` từ API; chưa tải xong thì phần tiến độ là null.
 */
export function buildCreditCardFees(
    sources: ISourcesOfMoneyData[],
    progress: ICreditCardFeeProgress[] = [],
    today: Dayjs = dayjs(),
): ICreditCardFeeItem[] {
    const progressById = new Map(progress.map((item) => [item.sourceOfMoneyId, item]));
    const items: ICreditCardFeeItem[] = [];

    for (const source of sources) {
        if (source.type !== SourcesOfMoneyType.CREDIT_CARD) continue;
        const details: Partial<ICreditDetails> = source.creditDetails ?? {};
        const hasAnnual =
            details.annualFee != null || details.annualFeeDay != null || details.annualFeeWaiverPeriod;
        const hasManagement =
            details.managementFee != null ||
            details.managementFeeWaiverMinTransactions != null ||
            details.managementFeeWaiverMinSpend != null;
        const latePenalty = buildLatePenalty(details);
        if (
            !hasAnnual &&
            !hasManagement &&
            details.paymentFee == null &&
            details.usageFee == null &&
            !latePenalty
        ) {
            continue;
        }

        const nextAnnualFeeDate =
            details.annualFeeDay && details.annualFeeMonth
                ? getNextAnnualDate(details.annualFeeDay, details.annualFeeMonth, today)
                : null;
        const daysLeft = nextAnnualFeeDate
            ? nextAnnualFeeDate.diff(today.startOf("day"), "day")
            : null;
        const cardProgress = progressById.get(source._id);
        const waiverSpend =
            details.annualFeeWaiverPeriod === AnnualFeeWaiverPeriod.MONTH
                ? cardProgress?.cycleSpend
                : cardProgress?.yearSpend;
        const cycle = getStatementCycle(details.statementDate, today);

        items.push({
            _id: source._id,
            name: source.name,
            cycleStart: cycle.start,
            cycleEnd: cycle.end,
            annualFee: details.annualFee ?? null,
            nextAnnualFeeDate,
            daysLeft,
            status:
                daysLeft != null
                    ? (getDueStatus(daysLeft) as ICreditCardFeeItem["status"])
                    : null,
            annualFeeWaiverPeriod: details.annualFeeWaiverPeriod ?? null,
            annualFeeWaiver: details.annualFeeWaiverPeriod
                ? toWaiver(waiverSpend, details.annualFeeWaiverMinSpend)
                : null,
            managementFee: details.managementFee ?? null,
            managementFeeDay: details.managementFeeDay ?? null,
            managementFeeWaiver: buildManagementWaiver(details, cardProgress),
            paymentFee: buildPaymentFee(details, cardProgress),
            usageFee:
                details.usageFee != null
                    ? {
                          fee: details.usageFee,
                          transactions: cardProgress?.cycleTransactions ?? null,
                          charged: (cardProgress?.cycleTransactions ?? 0) > 0,
                      }
                    : null,
            latePenalty,
        });
    }
    return items.sort((a, b) => (a.daysLeft ?? Infinity) - (b.daysLeft ?? Infinity));
}

/* ------------------------------------------------------------------ */
/* Thẻ tín dụng: gộp dư nợ + phí cho khối "Thẻ tín dụng" trên dashboard */
/* ------------------------------------------------------------------ */

export type HeadlineTone = "warn" | "in" | "neutral";

export interface ICardFeeHeadline {
    text: string;
    tone: HeadlineTone;
}

export interface ICreditCardOverviewItem {
    _id: string;
    name: string;
    creditLimit: number;
    currentDebt: number;
    availableCredit: number;
    nextDueDate: Dayjs | null;
    daysLeft: number | null;
    /** Chỉ có ý nghĩa khi còn dư nợ */
    status: CreditDueStatus;
    fee: ICreditCardFeeItem | null;
    headline: ICardFeeHeadline;
}

const formatVnd = (value: number) => `${Math.round(value).toLocaleString("vi-VN")} ₫`;
/** "116,2 tr" / "850 nghìn" cho câu tóm tắt ngắn */
function formatShortVnd(value: number) {
    if (value >= 1_000_000) {
        return `${(value / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tr`;
    }
    return formatVnd(value);
}

/** Ngày cuối kỳ sao kê hiện tại (cycleEnd là mốc mở, nên lùi 1 ngày). */
const lastCycleDay = (fee: ICreditCardFeeItem) => fee.cycleEnd.subtract(1, "day").format("DD/MM");

/** Phần còn thiếu để miễn phí quản lý: "5 GD hoặc chi 3 tr". */
function describeManagementGap(waiver: IManagementFeeWaiver) {
    const parts: string[] = [];
    if (waiver.transactions && !waiver.transactions.achieved) {
        parts.push(`${waiver.transactions.target - waiver.transactions.current} GD`);
    }
    if (waiver.spend && !waiver.spend.achieved) {
        parts.push(`chi ${formatShortVnd(waiver.spend.target - waiver.spend.current)}`);
    }
    return parts.join(" hoặc ");
}

/**
 * Một câu tóm tắt "phí sắp tới" của thẻ, ưu tiên khoản sắp phát sinh trong kỳ này.
 * Thứ tự: phí quản lý chưa đạt miễn → phí sử dụng đã phát sinh → phí trả nợ đã phát sinh
 * → phí thường niên → đã miễn phí quản lý → phí sử dụng nếu có chi tiêu → không có phí.
 */
export function getCardFeeHeadline(fee: ICreditCardFeeItem | null): ICardFeeHeadline {
    if (!fee) return { text: "Chưa cấu hình phí", tone: "neutral" };

    const managementPending =
        (fee.managementFee ?? 0) > 0 && fee.managementFeeWaiver && !fee.managementFeeWaiver.achieved;
    if (managementPending && fee.managementFeeWaiver) {
        return {
            text: `Phí quản lý ${formatVnd(fee.managementFee ?? 0)}/tháng · cần thêm ${describeManagementGap(fee.managementFeeWaiver)} trước ${lastCycleDay(fee)}`,
            tone: "warn",
        };
    }
    if (fee.usageFee?.charged && fee.usageFee.fee > 0) {
        return { text: `Phí sử dụng ${formatVnd(fee.usageFee.fee)} kỳ này (đã có chi tiêu)`, tone: "warn" };
    }
    if (fee.paymentFee && fee.paymentFee.estimatedTotal > 0) {
        return { text: `Phí trả nợ ≈${formatVnd(fee.paymentFee.estimatedTotal)} kỳ này`, tone: "warn" };
    }
    if ((fee.annualFee ?? 0) > 0 && fee.nextAnnualFeeDate) {
        if (fee.annualFeeWaiver?.achieved) {
            return { text: "Đã đủ điều kiện miễn phí thường niên", tone: "in" };
        }
        const gap = fee.annualFeeWaiver
            ? ` · cần chi thêm ${formatShortVnd(fee.annualFeeWaiver.target - fee.annualFeeWaiver.current)} để miễn`
            : "";
        return {
            text: `Phí thường niên ${formatVnd(fee.annualFee ?? 0)} vào ${fee.nextAnnualFeeDate.format("DD/MM/YYYY")}${gap}`,
            tone: (fee.daysLeft ?? Infinity) <= 30 ? "warn" : "neutral",
        };
    }
    if ((fee.managementFee ?? 0) > 0 && fee.managementFeeWaiver?.achieved) {
        return { text: "Đã miễn phí quản lý kỳ này", tone: "in" };
    }
    if (fee.usageFee && fee.usageFee.fee > 0) {
        return { text: `Phí sử dụng ${formatVnd(fee.usageFee.fee)}/kỳ nếu có chi tiêu`, tone: "neutral" };
    }
    return { text: "Không có phí sắp tới", tone: "in" };
}

/**
 * Mọi thẻ tín dụng (kể cả không dư nợ), kèm hạn trả và phí.
 * Thẻ còn dư nợ lên trước (hạn gần nhất trước), các thẻ còn lại giữ thứ tự nguồn tiền.
 */
export function buildCreditCardsOverview(
    sources: ISourcesOfMoneyData[],
    fees: ICreditCardFeeItem[],
    today: Dayjs = dayjs(),
): ICreditCardOverviewItem[] {
    const feeById = new Map(fees.map((fee) => [fee._id, fee]));
    const items = sources
        .filter((source) => source.type === SourcesOfMoneyType.CREDIT_CARD)
        .map((source) => {
            const creditLimit = source.creditDetails?.creditLimit ?? 0;
            const currentDebt = source.creditDetails?.currentDebt ?? 0;
            const dueDay = source.creditDetails?.dueDate;
            const nextDueDate = dueDay ? getNextDueDate(dueDay, today) : null;
            const daysLeft = nextDueDate ? nextDueDate.diff(today.startOf("day"), "day") : null;
            const fee = feeById.get(source._id) ?? null;
            return {
                _id: source._id,
                name: source.name,
                creditLimit,
                currentDebt,
                availableCredit: Math.max(0, creditLimit - currentDebt),
                nextDueDate,
                daysLeft,
                status: getDueStatus(daysLeft),
                fee,
                headline: getCardFeeHeadline(fee),
            };
        });
    const withDebt = items
        .filter((item) => item.currentDebt > 0)
        .sort((a, b) => (a.daysLeft ?? Infinity) - (b.daysLeft ?? Infinity));
    const noDebt = items.filter((item) => item.currentDebt <= 0);
    return [...withDebt, ...noDebt];
}

/* ------------------------------------------------------------------ */
/* "Cần chú ý": việc người dùng nên làm ngay                           */
/* ------------------------------------------------------------------ */

export type AttentionTone = "debt" | "warn";

export interface IAttentionItem {
    key: string;
    tone: AttentionTone;
    icon: "due" | "fee" | "net-worth";
    title: string;
    description: string;
    /** Thẻ cần trả nợ: nút "Thanh toán" mở form chuyển tiền điền sẵn */
    payCard?: { _id: string; amount: number };
}

/** Số mục tối đa trong hàng "Cần chú ý" */
const MAX_ATTENTION_ITEMS = 4;
/** Phí thường niên được nhắc khi còn ≤ số ngày này */
const ANNUAL_FEE_REMIND_DAYS = 30;

/**
 * Thứ tự ưu tiên: thẻ đến hạn ≤ 7 ngày (gần nhất trước) → phí sắp tính chưa đạt miễn → tài sản ròng âm.
 */
export function buildAttentionItems(
    cards: ICreditCardOverviewItem[],
    netWorth: number,
    totalCreditDebt: number,
    cashTotal: number,
): IAttentionItem[] {
    const items: IAttentionItem[] = [];

    for (const card of cards) {
        if (card.currentDebt <= 0 || card.daysLeft == null || card.daysLeft > DUE_SOON_DAYS) continue;
        const when = card.daysLeft === 0 ? "hôm nay" : `${card.nextDueDate?.format("DD/MM")} · còn ${card.daysLeft} ngày`;
        items.push({
            key: `due-${card._id}`,
            tone: card.daysLeft <= DUE_URGENT_DAYS ? "debt" : "warn",
            icon: "due",
            title: `${card.name} đến hạn ${when}`,
            description: `Cần trả ${formatVnd(card.currentDebt)}`,
            payCard: { _id: card._id, amount: card.currentDebt },
        });
    }

    for (const card of cards) {
        const fee = card.fee;
        if (!fee) continue;
        const waiver = fee.managementFeeWaiver;
        if ((fee.managementFee ?? 0) > 0 && waiver && !waiver.achieved) {
            items.push({
                key: `management-${card._id}`,
                tone: "warn",
                icon: "fee",
                title: `${card.name} sắp tính phí quản lý ${formatVnd(fee.managementFee ?? 0)}`,
                description: `Cần thêm ${describeManagementGap(waiver)} trước ${lastCycleDay(fee)}`,
            });
        }
        if (
            (fee.annualFee ?? 0) > 0 &&
            fee.nextAnnualFeeDate &&
            (fee.daysLeft ?? Infinity) <= ANNUAL_FEE_REMIND_DAYS &&
            !fee.annualFeeWaiver?.achieved
        ) {
            items.push({
                key: `annual-${card._id}`,
                tone: (fee.daysLeft ?? Infinity) <= DUE_URGENT_DAYS ? "debt" : "warn",
                icon: "fee",
                title: `${card.name} sắp thu phí thường niên ${formatVnd(fee.annualFee ?? 0)}`,
                description: `Ngày ${fee.nextAnnualFeeDate.format("DD/MM/YYYY")} · còn ${fee.daysLeft} ngày`,
            });
        }
    }

    // Tài sản ròng âm luôn được giữ một chỗ, kể cả khi có nhiều nhắc hạn/phí
    if (netWorth < 0) {
        return [
            ...items.slice(0, MAX_ATTENTION_ITEMS - 1),
            {
                key: "net-worth",
                tone: "debt",
                icon: "net-worth",
                title: "Tài sản ròng đang âm",
                description: `Dư nợ thẻ ${formatVnd(totalCreditDebt)} lớn hơn tiền mặt ${formatVnd(cashTotal)}`,
            },
        ];
    }
    return items.slice(0, MAX_ATTENTION_ITEMS);
}
