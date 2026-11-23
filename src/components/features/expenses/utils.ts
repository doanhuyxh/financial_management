import type {
    IExpenseCategoryRef,
    IExpenseSourceRef,
    IExpensesData,
} from "@/libs/interfaces/expensesData";
import { SourcesOfMoneyType } from "@/libs/interfaces/sourcesOfMoneyData";
import { withArchivedLabel } from "@/libs/utils/archivedRef";

/** Dùng được cho cả chi tiêu và chi dự kiến (cùng dạng ref danh mục / nguồn). */
type ExpenseRefs = Pick<IExpensesData, "categoryId" | "sourceOfMoneyId">;

export function getExpenseCategory(
    record: ExpenseRefs,
): IExpenseCategoryRef | null {
    if (!record.categoryId) return null;
    if (typeof record.categoryId === "string") {
        return { _id: record.categoryId, name: "—" };
    }
    return withArchivedLabel(record.categoryId);
}

export function getExpenseSource(record: ExpenseRefs): IExpenseSourceRef | null {
    if (!record.sourceOfMoneyId) return null;
    if (typeof record.sourceOfMoneyId === "string") {
        return {
            _id: record.sourceOfMoneyId,
            name: "—",
            type: SourcesOfMoneyType.OTHER,
        };
    }
    return withArchivedLabel(record.sourceOfMoneyId);
}

export function getRefId(
    value: string | { _id: string } | null | undefined,
): string {
    if (!value) return "";
    if (typeof value === "string") return value;
    return value._id;
}

export { currencyFormatter, formatMoney } from "@/libs/utils/formatMoney";
