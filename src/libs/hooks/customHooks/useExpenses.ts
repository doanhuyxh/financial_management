"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { configQueryKey, QUERY_STALE_TIME } from "@/libs/constants/configKey";
import type {
    IFromExpensesData,
    IPaginatedExpensesQuery,
} from "@/libs/interfaces/expensesData";
import {
    createExpense,
    deleteExpense,
    getExpenses,
    getExpenseSuggestions,
    updateExpense,
} from "@/libs/networkApi/expenses.api";

function invalidateExpenseRelated(queryClient: ReturnType<typeof useQueryClient>) {
    queryClient.invalidateQueries({ queryKey: [configQueryKey.EXPENSES] });
    queryClient.invalidateQueries({ queryKey: [configQueryKey.SOURCES_OF_MONEY] });
    queryClient.invalidateQueries({ queryKey: [configQueryKey.DASHBOARD_EXPENSES_SUMMARY] });
    queryClient.invalidateQueries({ queryKey: [configQueryKey.DASHBOARD_CASHFLOW] });
    queryClient.invalidateQueries({ queryKey: [configQueryKey.BUDGETS] });
}

export const useGetExpenses = (query: IPaginatedExpensesQuery = {}) => {
    return useQuery({
        queryKey: [configQueryKey.EXPENSES, query],
        queryFn: () => getExpenses(query),
        placeholderData: keepPreviousData,
        staleTime: QUERY_STALE_TIME.TRANSACTION,
    });
};

/** Key nằm dưới [EXPENSES] nên các mutation hiện có tự invalidate. */
export const useGetExpenseSuggestions = (enabled = true) => {
    return useQuery({
        queryKey: [configQueryKey.EXPENSES, "suggestions"],
        queryFn: () => getExpenseSuggestions(),
        staleTime: QUERY_STALE_TIME.REFERENCE,
        enabled,
    });
};

export const useCreateExpense = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (body: IFromExpensesData) => createExpense(body),
        onSuccess: () => invalidateExpenseRelated(queryClient),
    });
};

export const useUpdateExpense = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, body }: { id: string; body: IFromExpensesData }) =>
            updateExpense(id, body),
        onSuccess: () => invalidateExpenseRelated(queryClient),
    });
};

export const useDeleteExpense = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => deleteExpense(id),
        onSuccess: () => invalidateExpenseRelated(queryClient),
    });
};
