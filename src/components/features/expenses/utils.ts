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

export { currencyFormatter, formatMoney } from "@/libs/utils/formatMoney";
