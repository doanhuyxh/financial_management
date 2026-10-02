"use client";

import { useMemo } from "react";
import { Empty, Spin } from "antd";
import { Pie } from "@ant-design/plots";
import { useDashboardContext } from "@/components/features/dashboard/context";
import { useIsDarkMode } from "@/libs/hooks/useIsDarkMode";

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
});

/** Max individual slices; remaining are merged into "Khác". */
const MAX_VISIBLE_SLICES = 6;
/** Hide outside labels for slices below this share of the total. */
const MIN_LABEL_RATIO = 0.05;

type CategorySlice = {
    categoryId: string;
    categoryName: string;
    total: number;
};

function prepareChartData(data: CategorySlice[]): CategorySlice[] {
    if (data.length <= MAX_VISIBLE_SLICES) {
        return data;
    }

    const sorted = [...data].sort((a, b) => b.total - a.total);
    const main = sorted.slice(0, MAX_VISIBLE_SLICES - 1);
    const rest = sorted.slice(MAX_VISIBLE_SLICES - 1);
    const otherTotal = rest.reduce((sum, item) => sum + item.total, 0);

    return [
        ...main,
        {
            categoryId: "__other__",
            categoryName: `Khác (${rest.length})`,
            total: otherTotal,
        },
    ];
}

export default function CategoryPieChart() {
    const { summary, isLoading, monthValue } = useDashboardContext();
    const isDark = useIsDarkMode();
    const rawData = summary?.byCategory ?? [];

    const data = useMemo(() => prepareChartData(rawData), [rawData]);
    const totalAmount = useMemo(
        () => data.reduce((sum, item) => sum + item.total, 0),
        [data],
    );

    const config = {
        data,
        theme: isDark ? "classicDark" : "classic",
        angleField: "total",
        colorField: "categoryName",
        radius: 0.72,
        innerRadius: 0.55,
        padding: 24,
        legend: {
            color: {
                title: false,
                position: "bottom" as const,
                rowPadding: 6,
                itemLabelFill: isDark ? "#e2e8f0" : "#0f172a",
            },
        },
        label: {
            text: (item: CategorySlice) => {
                if (!totalAmount || item.total / totalAmount < MIN_LABEL_RATIO) {
                    return "";
                }
                return `${item.categoryName}\n${currencyFormatter.format(item.total)}`;
            },
            position: "outside" as const,
            transform: [
                { type: "overlapDodgeY" as const },
                { type: "overlapHide" as const },
                { type: "exceedAdjust" as const },
            ],
            style: {
                fontSize: 11,
                lineHeight: 14,
                fill: isDark ? "#e2e8f0" : "#0f172a",
            },
            connectorStroke: isDark ? "#64748b" : "#94a3b8",
        },
        tooltip: {
            title: "categoryName",
            items: [
                {
                    field: "total",
                    name: "Chi tiêu",
                    valueFormatter: (value: number) => currencyFormatter.format(value),
                },
            ],
        },
        interaction: {
            elementHighlight: true,
        },
    };

    return (
        <div className="rounded-xl border border-border bg-background p-4">
            <div className="mb-3">
                <h2 className="text-base font-semibold">
                    Chi tiêu theo danh mục
                </h2>
                <p className="text-xs text-muted-foreground">
                    Tháng {monthValue.format("MM/YYYY")}
                </p>
            </div>

            {isLoading ? (
                <div className="flex h-72 items-center justify-center">
                    <Spin />
                </div>
            ) : data.length === 0 ? (
                <div className="flex h-72 items-center justify-center">
                    <Empty description="Chưa có chi tiêu trong tháng này" />
                </div>
            ) : (
                <div className="h-105">
                    <Pie key={isDark ? "dark" : "light"} {...config} height={420} autoFit />
                </div>
            )}
        </div>
    );
}
