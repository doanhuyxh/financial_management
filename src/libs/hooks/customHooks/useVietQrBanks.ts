"use client";

import { useQuery } from "@tanstack/react-query";
import { configQueryKey } from "@/libs/constants/configKey";
import { getVietQrBankApps, getVietQrBanks, type BankAppPlatform } from "@/libs/networkApi/vietqr.api";

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

/** App ngân hàng mở được bằng deeplink (theo iOS/Android): tải một lần mỗi phiên. */
export const useVietQrBankApps = (platform: BankAppPlatform, enabled = true) => {
    return useQuery({
        queryKey: [configQueryKey.VIETQR_BANK_APPS, platform],
        queryFn: () => getVietQrBankApps(platform),
        enabled,
        staleTime: Infinity,
        gcTime: Infinity,
    });
};
