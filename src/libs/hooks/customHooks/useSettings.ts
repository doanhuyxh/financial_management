"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs, { type Dayjs } from "dayjs";
import { configQueryKey, QUERY_STALE_TIME } from "@/libs/constants/configKey";
import type { IFromUserSettingsData } from "@/libs/interfaces/userSettingsData";
import { getSettings, updateSettings } from "@/libs/networkApi/settings.api";

export const useGetSettings = () => {
    return useQuery({
        queryKey: [configQueryKey.SETTINGS],
        queryFn: () => getSettings(),
        staleTime: QUERY_STALE_TIME.REFERENCE,
    });
};

/** Mốc khóa sổ dạng dayjs (đầu ngày), null khi không khóa. Dùng cho ô chọn ngày của form. */
export const useLedgerLock = (): Dayjs | null => {
    const { data } = useGetSettings();
    const value = data?.data?.ledgerLockedBefore;
    return value ? dayjs(value).startOf("day") : null;
};

export const useUpdateSettings = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (body: IFromUserSettingsData) => updateSettings(body),
        onSuccess: (response) => {
            queryClient.setQueryData([configQueryKey.SETTINGS], response);
        },
    });
};
