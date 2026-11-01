"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { configQueryKey } from "@/libs/constants/configKey";
import type { ISourceTransactionQuery } from "@/libs/interfaces/sourceTransactionsData";
import {
    getPublicShareInfo,
    getPublicShareTransactions,
} from "@/libs/networkApi/public-share.api";

/** Link không hợp lệ trả 404: không retry. */
export const useGetPublicShareInfo = (token: string) => {
    return useQuery({
        queryKey: [configQueryKey.PUBLIC_SHARE, token],
        queryFn: () => getPublicShareInfo(token),
        enabled: Boolean(token),
        retry: false,
    });
};

export const useGetPublicShareTransactions = (
    token: string,
    query: Omit<ISourceTransactionQuery, "kind">,
    enabled: boolean,
) => {
    return useQuery({
        queryKey: [configQueryKey.PUBLIC_SHARE, token, "transactions", query],
        queryFn: () => getPublicShareTransactions(token, query),
        enabled: Boolean(token) && enabled,
        placeholderData: keepPreviousData,
        retry: false,
    });
};
