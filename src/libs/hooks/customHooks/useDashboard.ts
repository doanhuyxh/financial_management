"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { configQueryKey, QUERY_STALE_TIME } from "@/libs/constants/configKey";
import type { IDashboardExpensesSummaryQuery } from "@/libs/interfaces/dashboardData";
import { getDashboardExpensesSummary } from "@/libs/networkApi/dashboard.api";

export const useGetDashboardExpensesSummary = (
    query: IDashboardExpensesSummaryQuery,
) => {
    return useQuery({
        queryKey: [configQueryKey.DASHBOARD_EXPENSES_SUMMARY, query],
        queryFn: () => getDashboardExpensesSummary(query),
        enabled: Boolean(query.year && query.month),
        placeholderData: keepPreviousData,
        staleTime: QUERY_STALE_TIME.TRANSACTION,
    });
};
