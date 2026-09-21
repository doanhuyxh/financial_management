"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { configQueryKey } from "@/libs/constants/configKey";
import type {
    IFromExpensesData,
    IPaginatedExpensesQuery,
} from "@/libs/interfaces/expensesData";
import {
    createExpense,
    deleteExpense,
    getExpenses,
    updateExpense,
} from "@/libs/networkApi/expenses.api";

function invalidateExpenseRelated(queryClient: ReturnType<typeof useQueryClient>) {
    queryClient.invalidateQueries({ queryKey: [configQueryKey.EXPENSES] });
    queryClient.invalidateQueries({ queryKey: [configQueryKey.SOURCES_OF_MONEY] });
}

export const useGetExpenses = (query: IPaginatedExpensesQuery = {}) => {
    return useQuery({
        queryKey: [configQueryKey.EXPENSES, query],
        queryFn: () => getExpenses(query),
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
