"use client";

import { useMemo } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { configQueryKey, QUERY_STALE_TIME } from "@/libs/constants/configKey";
import type {
    IFromSourcesOfMoneyData,
    IPaginatedSourcesOfMoneyQuery,
} from "@/libs/interfaces/sourcesOfMoneyData";
import type { IFromShareLinkData } from "@/libs/interfaces/shareLinksData";
import type { ISourceTransactionQuery } from "@/libs/interfaces/sourceTransactionsData";
import type { IApplyReconcileData } from "@/libs/interfaces/balanceReconcileData";
import {
    applySourceReconcile,
    createShareLink,
    createSourcesOfMoney,
    deleteSourcesOfMoney,
    getCreditCardFeeProgress,
    getShareLinks,
    getSourceReconcile,
    getSourceTransactions,
    getSourcesOfMoney,
    reorderSourcesOfMoney,
    revokeShareLink,
    updateSourcesOfMoney,
} from "@/libs/networkApi/sources-of-money.api";
import { optimisticReorder, restoreQuerySnapshots } from "@/libs/hooks/customHooks/reorderCache";

export const useGetSourcesOfMoney = (query: IPaginatedSourcesOfMoneyQuery = {}) => {
    return useQuery({
        queryKey: [configQueryKey.SOURCES_OF_MONEY, query],
        queryFn: () => getSourcesOfMoney(query),
        placeholderData: keepPreviousData,
        staleTime: QUERY_STALE_TIME.REFERENCE,
    });
};

/**
 * Key nằm dưới SOURCES_OF_MONEY: mọi mutation chi tiêu/thu nhập/chuyển tiền/nguồn tiền
 * (vốn invalidate SOURCES_OF_MONEY) đều làm mới lịch sử.
 */
export const useGetSourceTransactions = (
    sourceId: string | null,
    query: ISourceTransactionQuery,
) => {
    return useQuery({
        queryKey: [configQueryKey.SOURCES_OF_MONEY, "transactions", sourceId, query],
        queryFn: () => getSourceTransactions(sourceId as string, query),
        enabled: Boolean(sourceId),
        placeholderData: keepPreviousData,
    });
};

export const useGetShareLinks = (sourceId: string | null) => {
    return useQuery({
        queryKey: [configQueryKey.SOURCES_OF_MONEY, "shares", sourceId],
        queryFn: () => getShareLinks(sourceId as string),
        enabled: Boolean(sourceId),
    });
};

export const useCreateShareLink = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ sourceId, body }: { sourceId: string; body: IFromShareLinkData }) =>
            createShareLink(sourceId, body),
        onSuccess: (_data, { sourceId }) => {
            queryClient.invalidateQueries({
                queryKey: [configQueryKey.SOURCES_OF_MONEY, "shares", sourceId],
            });
        },
    });
};

export const useRevokeShareLink = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (shareId: string) => revokeShareLink(shareId),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [configQueryKey.SOURCES_OF_MONEY, "shares"],
            });
        },
    });
};

/**
 * Key nằm dưới SOURCES_OF_MONEY: sửa thẻ và mọi mutation chi tiêu (vốn invalidate
 * SOURCES_OF_MONEY) đều làm mới tiến độ miễn phí.
 */
export const useGetCreditCardFeeProgress = () => {
    return useQuery({
        queryKey: [configQueryKey.SOURCES_OF_MONEY, "credit-card-fees"],
        queryFn: () => getCreditCardFeeProgress(),
        staleTime: QUERY_STALE_TIME.TRANSACTION,
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
        // Cả khi lỗi (vd. 409 số dư vừa đổi) cũng tải lại để form/bảng thấy số mới nhất
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: [configQueryKey.SOURCES_OF_MONEY] });
        },
    });
};

export const useReorderSourcesOfMoney = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (orderedIds: string[]) => reorderSourcesOfMoney(orderedIds),
        onMutate: (orderedIds) =>
            optimisticReorder(queryClient, configQueryKey.SOURCES_OF_MONEY, orderedIds),
        onError: (_error, _ids, snapshots) => {
            if (snapshots) restoreQuerySnapshots(queryClient, snapshots);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: [configQueryKey.SOURCES_OF_MONEY] });
        },
    });
};

export const useSourceOptions = (allLabel?: string) => {
    const query = useGetSourcesOfMoney({ page: 1, limit: 100 });
    const options = useMemo(() => {
        const mapped = (query.data?.data?.items ?? []).map((item) => ({
            value: item._id,
            label: item.name,
        }));
        if (!allLabel) return mapped;
        return [{ value: "", label: allLabel }, ...mapped];
    }, [query.data, allLabel]);

    return {
        options,
        items: query.data?.data?.items ?? [],
        isLoading: query.isLoading,
    };
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

/**
 * Đối soát số dư một nguồn. Key nằm dưới SOURCES_OF_MONEY nên mọi mutation giao dịch tự làm mới.
 * `enabled = false` cho tới khi người dùng bấm "Đối soát" (tính tổng trên toàn bộ giao dịch).
 */
export const useGetSourceReconcile = (sourceId: string | null, enabled: boolean) => {
    return useQuery({
        queryKey: [configQueryKey.SOURCES_OF_MONEY, "reconcile", sourceId],
        queryFn: () => getSourceReconcile(sourceId as string),
        enabled: Boolean(sourceId) && enabled,
    });
};

export const useApplySourceReconcile = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ sourceId, body }: { sourceId: string; body: IApplyReconcileData }) =>
            applySourceReconcile(sourceId, body),
        // Cả khi 409 cũng tải lại để thấy số mới nhất
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: [configQueryKey.SOURCES_OF_MONEY] });
            queryClient.invalidateQueries({ queryKey: [configQueryKey.DASHBOARD_CASHFLOW] });
        },
    });
};
