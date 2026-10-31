import dayjs, { type Dayjs } from "dayjs";
import {
    SourcesOfMoneyType,
    type ISourcesOfMoneyData,
} from "@/libs/interfaces/sourcesOfMoneyData";

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

export interface IAnnualFeeItem {
    _id: string;
    name: string;
    /** Phí ước tính; số thực tế có thể khác khi ngân hàng thu. */
    annualFee: number | null;
    nextFeeDate: Dayjs;
    daysLeft: number;
    status: Exclude<CreditDueStatus, "no-due-date">;
}

/** Next occurrence of `day`/`month` (yearly) from `today`; 29/02 falls back to 28/02. */
export function getNextAnnualDate(day: number, month: number, today: Dayjs = dayjs()): Dayjs {
    const start = today.startOf("day");
    const inYear = (year: number) => {
        const monthStart = dayjs(new Date(year, month - 1, 1));
        return monthStart.date(Math.min(day, monthStart.daysInMonth()));
    };

    const thisYear = inYear(start.year());
    if (!thisYear.isBefore(start, "day")) return thisYear;
    return inYear(start.year() + 1);
}

/** Credit cards with an annual fee date, nearest charge first. */
export function buildAnnualFees(
    sources: ISourcesOfMoneyData[],
    today: Dayjs = dayjs(),
): IAnnualFeeItem[] {
    const items: IAnnualFeeItem[] = [];
    for (const source of sources) {
        const { annualFee, annualFeeDay, annualFeeMonth } = source.creditDetails ?? {};
        if (source.type !== SourcesOfMoneyType.CREDIT_CARD || !annualFeeDay || !annualFeeMonth) {
            continue;
        }
        const nextFeeDate = getNextAnnualDate(annualFeeDay, annualFeeMonth, today);
        const daysLeft = nextFeeDate.diff(today.startOf("day"), "day");
        items.push({
            _id: source._id,
            name: source.name,
            annualFee: annualFee ?? null,
            nextFeeDate,
            daysLeft,
            status: getDueStatus(daysLeft) as IAnnualFeeItem["status"],
        });
    }
    return items.sort((a, b) => a.daysLeft - b.daysLeft);
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
