"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { configQueryKey } from "@/libs/constants/configKey";
import type { IFromDepositRateData } from "@/libs/interfaces/depositRatesData";
import {
    createDepositRate,
    deleteDepositRate,
    getDepositRates,
    refreshDepositRates,
    updateDepositRate,
} from "@/libs/networkApi/depositRates.api";

/** Lãi suất ngân hàng đổi chậm; server tự lấy lại sau 12 giờ. */
export const useGetDepositRates = () => {
    return useQuery({
        queryKey: [configQueryKey.DEPOSIT_RATES],
        queryFn: () => getDepositRates(),
        staleTime: 1000 * 60 * 30,
    });
};

function useInvalidateDepositRates() {
    const queryClient = useQueryClient();
    return () => queryClient.invalidateQueries({ queryKey: [configQueryKey.DEPOSIT_RATES] });
}

export const useRefreshDepositRates = () => {
    const invalidate = useInvalidateDepositRates();
    return useMutation({ mutationFn: () => refreshDepositRates(), onSettled: invalidate });
};

export const useCreateDepositRate = () => {
    const invalidate = useInvalidateDepositRates();
    return useMutation({
        mutationFn: (body: IFromDepositRateData) => createDepositRate(body),
        onSuccess: invalidate,
    });
};

export const useUpdateDepositRate = () => {
    const invalidate = useInvalidateDepositRates();
    return useMutation({
        mutationFn: ({ id, body }: { id: string; body: IFromDepositRateData }) => updateDepositRate(id, body),
        onSuccess: invalidate,
    });
};

export const useDeleteDepositRate = () => {
    const invalidate = useInvalidateDepositRates();
    return useMutation({
        mutationFn: (id: string) => deleteDepositRate(id),
        onSuccess: invalidate,
    });
};
