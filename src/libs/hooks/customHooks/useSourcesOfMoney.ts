"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { configQueryKey } from "@/libs/constants/configKey";
import type {
    IFromSourcesOfMoneyData,
    IPaginatedSourcesOfMoneyQuery,
} from "@/libs/interfaces/sourcesOfMoneyData";
import {
    createSourcesOfMoney,
    deleteSourcesOfMoney,
    getSourcesOfMoney,
    updateSourcesOfMoney,
} from "@/libs/networkApi/sources-of-money.api";

export const useGetSourcesOfMoney = (query: IPaginatedSourcesOfMoneyQuery = {}) => {
    return useQuery({
        queryKey: [configQueryKey.SOURCES_OF_MONEY, query],
        queryFn: () => getSourcesOfMoney(query),
    });
};

export const useCreateSourcesOfMoney = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (body: IFromSourcesOfMoneyData) => createSourcesOfMoney(body),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [configQueryKey.SOURCES_OF_MONEY] });
        },
    });
};

export const useUpdateSourcesOfMoney = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, body }: { id: string; body: IFromSourcesOfMoneyData }) =>
            updateSourcesOfMoney(id, body),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [configQueryKey.SOURCES_OF_MONEY] });
        },
    });
};

export const useDeleteSourcesOfMoney = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => deleteSourcesOfMoney(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [configQueryKey.SOURCES_OF_MONEY] });
        },
    });
};
