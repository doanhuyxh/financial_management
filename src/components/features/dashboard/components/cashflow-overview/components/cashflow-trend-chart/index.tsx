"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { Empty, Skeleton, Spin } from "antd";
import { useDashboardContext } from "@/components/features/dashboard/context";
import { useIsDarkMode } from "@/libs/hooks/useIsDarkMode";
import { useIsMobile } from "@/libs/hooks/use-mobile";
import { formatCompactMoney, formatMoney } from "@/libs/utils/formatMoney";

// G2 is ~380KB gzipped: load it in a separate chunk, client-only.
const Column = dynamic(() => import("@ant-design/plots").then((mod) => mod.Column), {
    ssr: false,
    loading: () => <Skeleton.Node active className="h-60! w-full!" />,
});

const INCOME_LABEL = "Thu nhập";
const EXPENSE_LABEL = "Chi tiêu";
const SERIES_COLORS = ["#22c55e", "#f43f5e"];

const formatCurrency = (value: number) => formatMoney(value);
const formatCompact = (value: number) => formatCompactMoney(value);

export default function CashflowTrendChart() {
    const { cashflow, isCashflowLoading } = useDashboardContext();
    const isDark = useIsDarkMode();
    const isMobile = useIsMobile();
    const chartHeight = isMobile ? 220 : 280;
    const trend = cashflow?.trend;
    const hasData = (trend ?? []).some((item) => item.income > 0 || item.expense > 0);

    const config = useMemo(() => {
        const tickFill = isDark ? "#cbd5e1" : "#475569";
        const gridStroke = isDark ? "#334155" : "#e2e8f0";
        const data = (trend ?? []).flatMap((item) => [
            { label: item.label, type: INCOME_LABEL, value: item.income },
            { label: item.label, type: EXPENSE_LABEL, value: item.expense },
        ]);
        return {
            data,
            theme: isDark ? "classicDark" : "classic",
            xField: "label",
            yField: "value",
            colorField: "type",
            group: true,
            scale: {
                color: { domain: [INCOME_LABEL, EXPENSE_LABEL], range: SERIES_COLORS },
            },
            axis: {
                x: {
                    title: false,
                    labelFill: tickFill,
                    labelFontSize: 11,
                    tickStroke: tickFill,
                    lineStroke: gridStroke,
                },
                y: {
                    title: false,
                    labelFill: tickFill,
                    labelFontSize: 11,
                    labelFormatter: formatCompact,
                    gridStroke,
                    gridStrokeOpacity: 1,
                    tickStroke: tickFill,
                    lineStroke: gridStroke,
                },
            },
            legend: {
                color: { position: "top", itemLabelFill: tickFill },
            },
            style: {
                radiusTopLeft: 4,
                radiusTopRight: 4,
            },
            tooltip: {
                items: [{ field: "value", valueFormatter: formatCurrency }],
            },
        };
    }, [trend, isDark]);

    if (isCashflowLoading) {
        return (
            <div className="flex h-60 items-center justify-center">
                <Spin />
            </div>
        );
    }

    if (!hasData) {
        return (
            <div className="flex h-60 items-center justify-center">
                <Empty description="Chưa có thu chi trong 6 tháng gần nhất" />
            </div>
        );
    }

    return (
        <div style={{ height: chartHeight }}>
            <Column
                key={`${isDark ? "dark" : "light"}-${chartHeight}`}
                {...config}
                height={chartHeight}
                autoFit
            />
        </div>
    );
}
