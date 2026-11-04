"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { configQueryKey, QUERY_STALE_TIME } from "@/libs/constants/configKey";
import type {
    IFromEndRolloverJourneyData,
    IFromUpdateRolloverJourneyData,
} from "@/libs/interfaces/rolloverJourneysData";
import {
    endRolloverJourney,
    getRolloverJourneyDetail,
    getRolloverJourneys,
    updateRolloverJourney,
} from "@/libs/networkApi/rollover-journeys.api";

/** Danh sách hành trình (đang mở trước). Key nằm dưới ROLLOVER_JOURNEYS. */
export const useGetRolloverJourneys = (cardId?: string, enabled = true) => {
    return useQuery({
        queryKey: [configQueryKey.ROLLOVER_JOURNEYS, "list", cardId ?? ""],
        queryFn: () => getRolloverJourneys(cardId),
        placeholderData: keepPreviousData,
        staleTime: QUERY_STALE_TIME.TRANSACTION,
        enabled,
    });
};

export const useGetRolloverJourneyDetail = (id: string | null) => {
    return useQuery({
        queryKey: [configQueryKey.ROLLOVER_JOURNEYS, "detail", id],
        queryFn: () => getRolloverJourneyDetail(id as string),
        enabled: Boolean(id),
        staleTime: QUERY_STALE_TIME.TRANSACTION,
    });
};

export const useEndRolloverJourney = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, body }: { id: string; body: IFromEndRolloverJourneyData }) =>
            endRolloverJourney(id, body),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: [configQueryKey.ROLLOVER_JOURNEYS] }),
    });
};

export const useUpdateRolloverJourney = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, body }: { id: string; body: IFromUpdateRolloverJourneyData }) =>
            updateRolloverJourney(id, body),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: [configQueryKey.ROLLOVER_JOURNEYS] }),
    });
};
