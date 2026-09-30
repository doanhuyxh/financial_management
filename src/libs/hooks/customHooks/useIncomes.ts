"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { configQueryKey } from "@/libs/constants/configKey";
import type {
    IFromIncomesData,
    IPaginatedIncomesQuery,
} from "@/libs/interfaces/incomesData";
import {
    createIncome,
    deleteIncome,
    getIncomes,
    updateIncome,
} from "@/libs/networkApi/incomes.api";

function invalidateIncomeRelated(queryClient: ReturnType<typeof useQueryClient>) {
    queryClient.invalidateQueries({ queryKey: [configQueryKey.INCOMES] });
    queryClient.invalidateQueries({ queryKey: [configQueryKey.SOURCES_OF_MONEY] });
}

export const useGetIncomes = (query: IPaginatedIncomesQuery = {}) => {
    return useQuery({
        queryKey: [configQueryKey.INCOMES, query],
        queryFn: () => getIncomes(query),
    });
};

export const useCreateIncome = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (body: IFromIncomesData) => createIncome(body),
        onSuccess: () => invalidateIncomeRelated(queryClient),
    });
};

export const useUpdateIncome = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, body }: { id: string; body: IFromIncomesData }) =>
            updateIncome(id, body),
        onSuccess: () => invalidateIncomeRelated(queryClient),
    });
};

export const useDeleteIncome = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => deleteIncome(id),
        onSuccess: () => invalidateIncomeRelated(queryClient),
    });
};
