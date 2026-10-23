"use client";

import { useMemo } from "react";
import { useDashboardContext } from "@/components/features/dashboard/context";
import ExpenseDonutChart from "@/components/features/dashboard/components/expense-donut-chart";

export default function IncomePieChart() {
    const { cashflow, isCashflowLoading, monthValue } = useDashboardContext();
    const incomeByCategory = cashflow?.incomeByCategory;

    const items = useMemo(
        () =>
            (incomeByCategory ?? []).map((item) => ({
                key: item.categoryId,
                name: item.categoryName,
                total: item.total,
            })),
        [incomeByCategory],
    );

    return (
        <ExpenseDonutChart
            title="Thu nhập theo danh mục"
            subtitle={`Tháng ${monthValue.format("MM/YYYY")}`}
            items={items}
            isLoading={isCashflowLoading}
            emptyText="Chưa có thu nhập trong tháng này"
        />
    );
}
