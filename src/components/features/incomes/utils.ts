import type {
    IIncomeCategoryRef,
    IIncomeSourceRef,
    IIncomesData,
} from "@/libs/interfaces/incomesData";
import { SourcesOfMoneyType } from "@/libs/interfaces/sourcesOfMoneyData";

export function getIncomeCategory(
    record: IIncomesData,
): IIncomeCategoryRef | null {
    if (!record.categoryId) return null;
    if (typeof record.categoryId === "string") {
        return { _id: record.categoryId, name: "—" };
    }
    return record.categoryId;
}

export function getIncomeSource(record: IIncomesData): IIncomeSourceRef | null {
    if (!record.sourceOfMoneyId) return null;
    if (typeof record.sourceOfMoneyId === "string") {
        return {
            _id: record.sourceOfMoneyId,
            name: "—",
            type: SourcesOfMoneyType.OTHER,
        };
    }
    return record.sourceOfMoneyId;
}

export function getRefId(
    value: string | { _id: string } | null | undefined,
): string {
    if (!value) return "";
    if (typeof value === "string") return value;
    return value._id;
}

export const currencyFormatter = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
});

export function formatMoney(value?: number | null) {
    if (value == null || Number.isNaN(value)) return "—";
    return currencyFormatter.format(value);
}
