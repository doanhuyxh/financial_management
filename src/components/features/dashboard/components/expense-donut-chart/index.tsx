"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { Empty, Skeleton, Spin } from "antd";
import { useIsDarkMode } from "@/libs/hooks/useIsDarkMode";
import { useIsMobile } from "@/libs/hooks/use-mobile";
import { formatMoney, formatPercent } from "@/libs/utils/formatMoney";
import DonutLegend from "@/components/features/dashboard/components/expense-donut-chart/components/donut-legend";

// G2 is ~380KB gzipped: load it in a separate chunk, client-only.
const Pie = dynamic(() => import("@ant-design/plots").then((mod) => mod.Pie), {
    ssr: false,
    loading: () => <Skeleton.Node active className="h-70! w-full!" />,
});

/** Max individual slices; remaining are merged into "Khác". */
const MAX_VISIBLE_SLICES = 6;
/** Slice colors, shared by the chart and the HTML legend (length ≥ MAX_VISIBLE_SLICES). */
const SLICE_COLORS = ["#5B8FF9", "#61DDAA", "#65789B", "#F6BD16", "#7262FD", "#78D3F8"];
/** Hide outside labels for slices below this share of the total. */
const MIN_LABEL_RATIO = 0.05;

const formatCurrency = (value: number) => formatMoney(value);

export type DonutItem = {
    key: string;
    name: string;
    total: number;
};

type DonutSlice = DonutItem & {
    /** Share of the month total, 0–1 */
    ratio: number;
    color: string;
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
    return slices.map((item, index) => ({
        ...item,
        ratio: totalAmount ? item.total / totalAmount : 0,
        color: SLICE_COLORS[index % SLICE_COLORS.length],
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
    const isMobile = useIsMobile();
    const data = useMemo(() => prepareChartData(items), [items]);
    const chartHeight = isMobile ? 300 : 380;

    const config = useMemo(
        () => ({
            data,
            theme: isDark ? "classicDark" : "classic",
            angleField: "total",
            colorField: "name",
            radius: 0.72,
            innerRadius: 0.55,
            padding: 24,
            scale: {
                color: {
                    domain: data.map((item) => item.name),
                    range: data.map((item) => item.color),
                },
            },
            // G2's canvas legend has a fixed width and truncates long names;
            // an HTML legend (DonutLegend) is rendered next to the chart instead.
            legend: false as const,
            label: {
                text: (item: DonutSlice) => {
                    if (isMobile || item.ratio < MIN_LABEL_RATIO) {
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
        [data, isDark, isMobile],
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
                <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-center">
                    <div className="min-w-0 flex-1" style={{ height: chartHeight }}>
                        <Pie key={`${isDark ? "dark" : "light"}-${chartHeight}`} {...config} height={chartHeight} autoFit />
                    </div>
                    <div className="2xl:max-w-64 2xl:shrink-0">
                        <DonutLegend items={data} />
                    </div>
                </div>
            )}
        </div>
    );
}
