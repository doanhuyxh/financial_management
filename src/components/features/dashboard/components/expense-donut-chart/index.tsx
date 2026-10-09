"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { Empty, Spin } from "antd";
import { useIsDarkMode } from "@/libs/hooks/useIsDarkMode";

// G2 is ~380KB gzipped: load it in a separate chunk, client-only.
const Pie = dynamic(() => import("@ant-design/plots").then((mod) => mod.Pie), {
    ssr: false,
    loading: () => (
        <div className="flex h-105 items-center justify-center">
            <Spin />
        </div>
    ),
});

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat("vi-VN", {
    style: "percent",
    maximumFractionDigits: 1,
});

/** Max individual slices; remaining are merged into "Khác". */
const MAX_VISIBLE_SLICES = 6;
/** Hide outside labels for slices below this share of the total. */
const MIN_LABEL_RATIO = 0.05;

const formatCurrency = (value: number) => currencyFormatter.format(value);
const formatPercent = (value: number) => percentFormatter.format(value);

export type DonutItem = {
    key: string;
    name: string;
    total: number;
};

type DonutSlice = DonutItem & {
    /** Share of the month total, 0–1 */
    ratio: number;
};

function prepareChartData(data: DonutItem[]): DonutSlice[] {
    let slices = data;
    if (data.length > MAX_VISIBLE_SLICES) {
        const sorted = [...data].sort((a, b) => b.total - a.total);
        const main = sorted.slice(0, MAX_VISIBLE_SLICES - 1);
        const rest = sorted.slice(MAX_VISIBLE_SLICES - 1);
        slices = [
            ...main,
            {
                key: "__other__",
                name: `Khác (${rest.length})`,
                total: rest.reduce((sum, item) => sum + item.total, 0),
            },
        ];
    }

    const totalAmount = slices.reduce((sum, item) => sum + item.total, 0);
    return slices.map((item) => ({
        ...item,
        ratio: totalAmount ? item.total / totalAmount : 0,
    }));
}

interface IExpenseDonutChartProps {
    title: string;
    subtitle: string;
    items: DonutItem[];
    isLoading: boolean;
}

export default function ExpenseDonutChart({
    title,
    subtitle,
    items,
    isLoading,
}: IExpenseDonutChartProps) {
    const isDark = useIsDarkMode();
    const data = useMemo(() => prepareChartData(items), [items]);

    const config = useMemo(
        () => ({
            data,
            theme: isDark ? "classicDark" : "classic",
            angleField: "total",
            colorField: "name",
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
                text: (item: DonutSlice) => {
                    if (item.ratio < MIN_LABEL_RATIO) {
                        return "";
                    }
                    return `${item.name} · ${formatPercent(item.ratio)}\n${formatCurrency(item.total)}`;
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
                title: "name",
                items: [
                    {
                        field: "total",
                        name: "Chi tiêu",
                        valueFormatter: formatCurrency,
                    },
                    {
                        field: "ratio",
                        name: "Tỷ lệ",
                        valueFormatter: formatPercent,
                    },
                ],
            },
            interaction: {
                elementHighlight: true,
            },
        }),
        [data, isDark],
    );

    return (
        <div className="rounded-xl border border-border bg-background p-4">
            <div className="mb-3">
                <h2 className="text-base font-semibold">{title}</h2>
                <p className="text-xs text-muted-foreground">{subtitle}</p>
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
