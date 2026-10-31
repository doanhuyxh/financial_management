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

export interface ICreditCardDebtItem {
    _id: string;
    name: string;
    creditLimit: number;
    currentDebt: number;
    availableCredit: number;
    nextDueDate: Dayjs | null;
    daysLeft: number | null;
    status: CreditDueStatus;
}

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

/** Credit cards with outstanding debt, sorted by nearest due date first. */
export function buildCreditCardDebts(
    sources: ISourcesOfMoneyData[],
    today: Dayjs = dayjs(),
): ICreditCardDebtItem[] {
    return sources
        .filter(
            (source) =>
                source.type === SourcesOfMoneyType.CREDIT_CARD &&
                (source.creditDetails?.currentDebt ?? 0) > 0,
        )
        .map((source) => {
            const creditLimit = source.creditDetails?.creditLimit ?? 0;
            const currentDebt = source.creditDetails?.currentDebt ?? 0;
            const dueDay = source.creditDetails?.dueDate;
            const nextDueDate = dueDay ? getNextDueDate(dueDay, today) : null;
            const daysLeft = nextDueDate
                ? nextDueDate.diff(today.startOf("day"), "day")
                : null;

            return {
                _id: source._id,
                name: source.name,
                creditLimit,
                currentDebt,
                availableCredit: Math.max(0, creditLimit - currentDebt),
                nextDueDate,
                daysLeft,
                status: getDueStatus(daysLeft),
            };
        })
        .sort((a, b) => (a.daysLeft ?? Infinity) - (b.daysLeft ?? Infinity));
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

export type AssetGroup = "cash" | "credit";

export interface IAssetSourceItem {
    _id: string;
    name: string;
    type: SourcesOfMoneyType;
    group: AssetGroup;
    /** Số dư (nguồn thường) hoặc hạn mức còn lại (thẻ tín dụng). */
    amount: number;
}

export interface IAssetsSummary {
    cashTotal: number;
    availableCreditTotal: number;
    creditLimitTotal: number;
    totalAssets: number;
    /** Tiền mặt − tổng dư nợ thẻ. */
    netWorth: number;
    /** Nguồn có amount > 0, sắp xếp giảm dần. */
    cashSources: IAssetSourceItem[];
    creditSources: IAssetSourceItem[];
}

/** Tài sản hiện tại: tiền mặt (mọi nguồn không phải thẻ) + hạn mức tín dụng còn lại. */
export function buildAssetsSummary(sources: ISourcesOfMoneyData[]): IAssetsSummary {
    const cashSources: IAssetSourceItem[] = [];
    const creditSources: IAssetSourceItem[] = [];
    let creditLimitTotal = 0;
    let creditDebtTotal = 0;

    for (const source of sources) {
        const isCredit = source.type === SourcesOfMoneyType.CREDIT_CARD;
        let amount = source.balance ?? 0;
        if (isCredit) {
            const creditLimit = source.creditDetails?.creditLimit ?? 0;
            const currentDebt = source.creditDetails?.currentDebt ?? 0;
            creditLimitTotal += creditLimit;
            creditDebtTotal += currentDebt;
            amount = Math.max(0, creditLimit - currentDebt);
        }
        if (amount <= 0) continue;

        const item: IAssetSourceItem = {
            _id: source._id,
            name: source.name,
            type: source.type,
            group: isCredit ? "credit" : "cash",
            amount,
        };
        (isCredit ? creditSources : cashSources).push(item);
    }

    const byAmountDesc = (a: IAssetSourceItem, b: IAssetSourceItem) => b.amount - a.amount;
    cashSources.sort(byAmountDesc);
    creditSources.sort(byAmountDesc);

    const sum = (items: IAssetSourceItem[]) =>
        items.reduce((total, item) => total + item.amount, 0);
    const cashTotal = sum(cashSources);
    const availableCreditTotal = sum(creditSources);

    return {
        cashTotal,
        availableCreditTotal,
        creditLimitTotal,
        totalAssets: cashTotal + availableCreditTotal,
        netWorth: cashTotal - creditDebtTotal,
        cashSources,
        creditSources,
    };
}
