import type {
    IExpenseCategoryRef,
    IExpenseSourceRef,
    IExpensesData,
} from "@/libs/interfaces/expensesData";
import { SourcesOfMoneyType } from "@/libs/interfaces/sourcesOfMoneyData";

export function getExpenseCategory(
    record: IExpensesData,
): IExpenseCategoryRef | null {
    if (!record.categoryId) return null;
    if (typeof record.categoryId === "string") {
        return { _id: record.categoryId, name: "—" };
    }
    return record.categoryId;
}

export function getExpenseSource(record: IExpensesData): IExpenseSourceRef | null {
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
