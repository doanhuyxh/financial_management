"use client";

import { useQuery } from "@tanstack/react-query";
import { configQueryKey } from "@/libs/constants/configKey";
import type { IDashboardExpensesSummaryQuery } from "@/libs/interfaces/dashboardData";
import { getDashboardExpensesSummary } from "@/libs/networkApi/dashboard.api";

export const useGetDashboardExpensesSummary = (
    query: IDashboardExpensesSummaryQuery,
) => {
    return useQuery({
        queryKey: [configQueryKey.DASHBOARD_EXPENSES_SUMMARY, query],
        queryFn: () => getDashboardExpensesSummary(query),
        enabled: Boolean(query.year && query.month),
    });
};
