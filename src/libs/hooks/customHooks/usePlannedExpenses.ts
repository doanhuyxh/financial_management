"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useIdempotencyKey } from "@/libs/hooks/useIdempotencyKey";
import { configQueryKey, QUERY_STALE_TIME } from "@/libs/constants/configKey";
import type {
    IFromPlannedExpensesData,
    IPlannedExpensesQuery,
} from "@/libs/interfaces/plannedExpensesData";
import {
    cancelPlannedExpense,
    confirmPlannedExpense,
    createPlannedExpense,
    getPlannedExpenses,
    updatePlannedExpense,
} from "@/libs/networkApi/plannedExpenses.api";

/** Giữ chỗ đổi phần khả dụng của nguồn → luôn làm mới nguồn tiền. Xác nhận tạo chi tiêu → làm mới cả chi tiêu. */
function invalidatePlannedRelated(queryClient: ReturnType<typeof useQueryClient>, confirmed = false) {
    queryClient.invalidateQueries({ queryKey: [configQueryKey.PLANNED_EXPENSES] });
    queryClient.invalidateQueries({ queryKey: [configQueryKey.SOURCES_OF_MONEY] });
    if (confirmed) {
        queryClient.invalidateQueries({ queryKey: [configQueryKey.EXPENSES] });
        queryClient.invalidateQueries({ queryKey: [configQueryKey.DASHBOARD_EXPENSES_SUMMARY] });
        queryClient.invalidateQueries({ queryKey: [configQueryKey.DASHBOARD_CASHFLOW] });
    }
}

export const useGetPlannedExpenses = (query: IPlannedExpensesQuery = {}) => {
    return useQuery({
        queryKey: [configQueryKey.PLANNED_EXPENSES, query],
        queryFn: () => getPlannedExpenses(query),
        staleTime: QUERY_STALE_TIME.TRANSACTION,
    });
};

export const useCreatePlannedExpense = () => {
    const queryClient = useQueryClient();
    const idempotencyKey = useIdempotencyKey();
    return useMutation({
        mutationFn: (body: IFromPlannedExpensesData) => createPlannedExpense(body, idempotencyKey.get()),
        onSuccess: () => {
            idempotencyKey.rotate();
            invalidatePlannedRelated(queryClient);
        },
    });
};

export const useUpdatePlannedExpense = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, body }: { id: string; body: IFromPlannedExpensesData }) =>
            updatePlannedExpense(id, body),
        onSuccess: () => invalidatePlannedRelated(queryClient),
    });
};

export const useCancelPlannedExpense = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => cancelPlannedExpense(id),
        onSuccess: () => invalidatePlannedRelated(queryClient),
    });
};

export const useConfirmPlannedExpense = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => confirmPlannedExpense(id),
        onSuccess: () => invalidatePlannedRelated(queryClient, true),
    });
};
