"use client";

import { useQuery } from "@tanstack/react-query";
import { configQueryKey } from "@/libs/constants/configKey";
import { getVietQrBanks } from "@/libs/networkApi/vietqr.api";

/** Danh sách ngân hàng gần như không đổi: tải một lần mỗi phiên. */
export const useVietQrBanks = (enabled = true) => {
    return useQuery({
        queryKey: [configQueryKey.VIETQR_BANKS],
        queryFn: getVietQrBanks,
        enabled,
        staleTime: Infinity,
        gcTime: Infinity,
    });
};
