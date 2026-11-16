"use client";

import { useMemo } from "react";
import BarChart, { type IBarGroup, type IBarSeries } from "@/components/common/bar-chart";
import EmptyState from "@/components/common/empty-state";
import { Spinner } from "@/components/shadcn/ui/spinner";
import { useDashboardContext } from "@/components/features/dashboard/context";

const SERIES: IBarSeries[] = [
    { key: "income", label: "Thu nhập", colorClassName: "bg-money-in", textClassName: "text-money-in" },
    { key: "expense", label: "Chi tiêu", colorClassName: "bg-money-out", textClassName: "text-money-out" },
];

export default function TrendChart() {
    const { cashflow, isCashflowLoading } = useDashboardContext();
    // Bỏ các tháng trống ở đầu (trước khi bắt đầu ghi chép); tháng đang chạy gắn dấu "*"
    const groups = useMemo<IBarGroup[]>(() => {
        const items = cashflow?.trend ?? [];
        const firstWithData = items.findIndex((item) => item.income > 0 || item.expense > 0);
        if (firstWithData === -1) return [];
        const isCurrentMonth = cashflow?.period.isCurrentMonth;
        return items.slice(firstWithData).map((item, index, list) => {
            const label = isCurrentMonth && index === list.length - 1 ? `${item.label}*` : item.label;
            return { key: item.label, label, values: { income: item.income, expense: item.expense } };
        });
    }, [cashflow]);
    const hasData = groups.length > 0;

    if (isCashflowLoading) {
        return (
            <div className="flex h-60 items-center justify-center">
                <Spinner className="size-6 text-primary" />
            </div>
        );
    }

    if (!hasData) {
        return (
            <div className="flex h-60 items-center justify-center">
                <EmptyState description="Chưa có thu chi trong 6 tháng gần nhất" />
            </div>
        );
    }

    return <BarChart series={SERIES} groups={groups} legend barClassName="max-w-7" heightClassName="h-56 md:h-64" />;
}
