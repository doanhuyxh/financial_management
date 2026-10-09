"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { configQueryKey } from "@/libs/constants/configKey";
import type {
    IFromTransfersData,
    IPaginatedTransfersQuery,
} from "@/libs/interfaces/transfersData";
import {
    createTransfer,
    deleteTransfer,
    getTransfers,
} from "@/libs/networkApi/transfers.api";

function invalidateTransferRelated(
    queryClient: ReturnType<typeof useQueryClient>,
) {
    queryClient.invalidateQueries({ queryKey: [configQueryKey.TRANSFERS] });
    queryClient.invalidateQueries({ queryKey: [configQueryKey.SOURCES_OF_MONEY] });
    queryClient.invalidateQueries({ queryKey: [configQueryKey.EXPENSES] });
    queryClient.invalidateQueries({ queryKey: [configQueryKey.DASHBOARD_EXPENSES_SUMMARY] });
}

export const useGetTransfers = (query: IPaginatedTransfersQuery = {}) => {
    return useQuery({
        queryKey: [configQueryKey.TRANSFERS, query],
        queryFn: () => getTransfers(query),
    });
};

export const useCreateTransfer = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (body: IFromTransfersData) => createTransfer(body),
        onSuccess: () => invalidateTransferRelated(queryClient),
    });
};

export const useDeleteTransfer = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => deleteTransfer(id),
        onSuccess: () => invalidateTransferRelated(queryClient),
    });
};
