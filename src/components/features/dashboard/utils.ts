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
