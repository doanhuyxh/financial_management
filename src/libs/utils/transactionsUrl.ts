import { MENU_KEY } from "@/libs/constants/menuKey";

/** Loại giao dịch trên trang /transactions (`?type=`). */
export type TransactionType = "expense" | "income" | "transfer";

export const TRANSACTION_TYPES: TransactionType[] = ["expense", "income", "transfer"];

export function parseTransactionType(value: string | null | undefined): TransactionType {
    return TRANSACTION_TYPES.includes(value as TransactionType)
        ? (value as TransactionType)
        : "expense";
}

/**
 * URL trang Giao dịch, VD: buildTransactionsUrl("expense", { action: "create", amount: "50000" })
 * → "/transactions?type=expense&action=create&amount=50000". Bỏ qua tham số rỗng.
 */
export function buildTransactionsUrl(
    type: TransactionType,
    params: Record<string, string | number | null | undefined> = {},
) {
    const search = new URLSearchParams({ type });
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
    }
    return `${MENU_KEY.TRANSACTIONS}?${search.toString()}`;
}
