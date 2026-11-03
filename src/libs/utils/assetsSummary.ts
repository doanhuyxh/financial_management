import {
    SourcesOfMoneyType,
    type ISourcesOfMoneyData,
} from "@/libs/interfaces/sourcesOfMoneyData";

/**
 * Tổng hợp tài sản hiện tại từ toàn bộ nguồn tiền (dùng ở dashboard và trang nguồn tiền).
 * Nghiệp vụ: .agents/business/dashboard.md, mục "Tài sản".
 */
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
