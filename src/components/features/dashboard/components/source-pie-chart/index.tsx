"use client";

import { useMemo } from "react";
import { useDashboardContext } from "@/components/features/dashboard/context";
import ExpenseDonutChart from "@/components/features/dashboard/components/expense-donut-chart";

export default function SourcePieChart() {
    const { summary, isLoading, monthValue } = useDashboardContext();
    const bySource = summary?.bySource;

    const items = useMemo(
        () =>
            (bySource ?? []).map((item) => ({
                key: item.sourceId,
                name: item.sourceName,
                total: item.total,
            })),
        [bySource],
    );

    return (
        <ExpenseDonutChart
            title="Chi tiêu theo nguồn tiền"
            subtitle={`Tháng ${monthValue.format("MM/YYYY")}`}
            items={items}
            isLoading={isLoading}
        />
    );
}
