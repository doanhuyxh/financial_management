"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useIdempotencyKey } from "@/libs/hooks/useIdempotencyKey";
import { configQueryKey, QUERY_STALE_TIME } from "@/libs/constants/configKey";
import type {
    IFromCardRolloverData,
    IPaginatedCardRolloversQuery,
} from "@/libs/interfaces/cardRolloversData";
import {
    createCardRollover,
    deleteCardRollover,
    getCardRollovers,
} from "@/libs/networkApi/card-rollovers.api";

/** Đáo hạn đổi dư nợ thẻ và sinh một khoản chi phí, nên làm mới như một mutation chi tiêu. */
function invalidateRolloverRelated(queryClient: ReturnType<typeof useQueryClient>) {
    queryClient.invalidateQueries({ queryKey: [configQueryKey.CARD_ROLLOVERS] });
    queryClient.invalidateQueries({ queryKey: [configQueryKey.ROLLOVER_JOURNEYS] });
    queryClient.invalidateQueries({ queryKey: [configQueryKey.TRANSFERS] });
    queryClient.invalidateQueries({ queryKey: [configQueryKey.SOURCES_OF_MONEY] });
    queryClient.invalidateQueries({ queryKey: [configQueryKey.EXPENSES] });
    queryClient.invalidateQueries({ queryKey: [configQueryKey.DASHBOARD_EXPENSES_SUMMARY] });
    queryClient.invalidateQueries({ queryKey: [configQueryKey.DASHBOARD_CASHFLOW] });
}

export const useGetCardRollovers = (query: IPaginatedCardRolloversQuery = {}, enabled = true) => {
    return useQuery({
        queryKey: [configQueryKey.CARD_ROLLOVERS, query],
        queryFn: () => getCardRollovers(query),
        placeholderData: keepPreviousData,
        staleTime: QUERY_STALE_TIME.TRANSACTION,
        enabled,
    });
};

export const useCreateCardRollover = () => {
    const queryClient = useQueryClient();
    // Một khóa cho tới khi tạo thành công: bấm đúp / gửi lại không tạo trùng
    const idempotencyKey = useIdempotencyKey();

    return useMutation({
        mutationFn: (body: IFromCardRolloverData) => createCardRollover(body, idempotencyKey.get()),
        onSuccess: () => {
            idempotencyKey.rotate();
            invalidateRolloverRelated(queryClient);
        },
    });
};

export const useDeleteCardRollover = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, deletePayment }: { id: string; deletePayment?: boolean }) =>
            deleteCardRollover(id, deletePayment),
        onSuccess: () => invalidateRolloverRelated(queryClient),
    });
};
