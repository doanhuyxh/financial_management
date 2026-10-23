"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { configQueryKey, QUERY_STALE_TIME } from "@/libs/constants/configKey";
import type { IBudgetsQuery, IFromBudgetData } from "@/libs/interfaces/budgetsData";
import {
    createBudget,
    deleteBudget,
    getBudgets,
    updateBudget,
} from "@/libs/networkApi/budgets.api";

export const useGetBudgets = (query: IBudgetsQuery) => {
    return useQuery({
        queryKey: [configQueryKey.BUDGETS, query],
        queryFn: () => getBudgets(query),
        enabled: Boolean(query.year && query.month),
        placeholderData: keepPreviousData,
        staleTime: QUERY_STALE_TIME.TRANSACTION,
    });
};

export const useCreateBudget = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (body: IFromBudgetData) => createBudget(body),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [configQueryKey.BUDGETS] });
        },
    });
};

export const useUpdateBudget = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, body }: { id: string; body: Pick<IFromBudgetData, "amount"> }) =>
            updateBudget(id, body),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [configQueryKey.BUDGETS] });
        },
    });
};

export const useDeleteBudget = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => deleteBudget(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [configQueryKey.BUDGETS] });
        },
    });
};
