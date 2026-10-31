"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
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

const formatCurrency = (value: number) => formatMoney(value);
const formatCompact = (value: number) => formatCompactMoney(value);
const formatTooltipTitle = (item: { label: string }) => `Ngày ${item.label}`;

const MOBILE_DAY_WIDTH = 40;
// Fixed plot padding so the HTML y-axis (outside the scroll area) lines up with the grid.
const PLOT_PADDING_TOP = 12;
const PLOT_PADDING_BOTTOM = 28;
const Y_AXIS_WIDTH = 44;
const Y_TICK_COUNT = 5;

// Round the step to 1/2/2.5/5 × 10^n so labels read cleanly, then cover the max.
function getNiceTicks(max: number) {
    if (max <= 0) return [0];
    const rawStep = max / Y_TICK_COUNT;
    const magnitude = 10 ** Math.floor(Math.log10(rawStep));
    const step = ([1, 2, 2.5, 5, 10].find((n) => n * magnitude >= rawStep) ?? 10) * magnitude;
    const tickTotal = Math.ceil(max / step);
    return Array.from({ length: tickTotal + 1 }, (_, i) => i * step);
}

const EMPTY_DAYS: { day: number; label: string; total: number }[] = [];

type DayDatum = { day: number; label: string; total: number };
type G2EventTarget = {
    on: (event: string, cb: (e: { data?: { data?: DayDatum } }) => void) => void;
};

export default function DailyBarChart() {
    const { summary, isLoading, monthValue, handleViewDay } = useDashboardContext();
    const isDark = useIsDarkMode();
    const isMobile = useIsMobile();
    const chartHeight = isMobile ? 240 : 320;
    const data = summary?.byDay ?? EMPTY_DAYS;
    const hasData = data.some((item) => item.total > 0);
    // On mobile give each day a fixed slot so bars stay readable; the wrapper scrolls horizontally.
    const chartMinWidth = isMobile ? data.length * MOBILE_DAY_WIDTH : undefined;
    const yTicks = useMemo(() => getNiceTicks(Math.max(0, ...data.map((item) => item.total))), [data]);
    const yMax = yTicks[yTicks.length - 1] || 1;
    const plotHeight = chartHeight - PLOT_PADDING_TOP - PLOT_PADDING_BOTTOM;

    // The chart binds listeners once on mount, so read the latest handler via ref.
    const viewDayRef = useRef(handleViewDay);
    useEffect(() => {
        viewDayRef.current = handleViewDay;
    }, [handleViewDay]);

    // The plots wrapper re-emits G2 events by `e.type` ("click"), so `element:click`
    // only exists on the inner G2 chart.
    const handleChartReady = useCallback((plot: { chart?: G2EventTarget }) => {
        plot.chart?.on("element:click", (event) => {
            const day = event.data?.data?.day;
            if (day) viewDayRef.current(day);
        });
    }, []);

    const config = useMemo(() => {
        const tickFill = isDark ? "#cbd5e1" : "#475569";
        const gridStroke = isDark ? "#334155" : "#e2e8f0";
        return {
            data,
            theme: isDark ? "classicDark" : "classic",
            xField: "label",
            yField: "total",
            margin: 0,
            paddingTop: PLOT_PADDING_TOP,
            paddingBottom: PLOT_PADDING_BOTTOM,
            paddingLeft: 4,
            paddingRight: 8,
            scale: {
                y: { domain: [0, yMax], nice: false },
            },
            axis: {
                x: {
                    title: false,
                    labelFill: tickFill,
                    labelFontSize: 11,
                    tickStroke: tickFill,
                    lineStroke: gridStroke,
                },
                // Labels are drawn in HTML so they stay put while the bars scroll.
                y: {
                    title: false,
                    label: false,
                    tick: false,
                    line: false,
                    tickMethod: () => yTicks,
                    gridStroke,
                    gridStrokeOpacity: 1,
                },
            },
            style: {
                radiusTopLeft: 4,
                radiusTopRight: 4,
                cursor: "pointer",
            },
            tooltip: {
                title: formatTooltipTitle,
                items: [
                    {
                        field: "total",
                        name: "Chi tiêu",
                        valueFormatter: formatCurrency,
                    },
                ],
            },
            interaction: {
                elementHighlight: true,
            },
        };
    }, [data, isDark, yTicks, yMax]);

    return (
        <div className="rounded-xl border border-border bg-background p-4">
            <div className="mb-3">
                <h2 className="text-base font-semibold">Chi tiêu theo ngày</h2>
                <p className="text-xs text-muted-foreground">
                    Tháng {monthValue.format("MM/YYYY")}
                </p>
            </div>

            {isLoading ? (
                <div className="flex h-72 items-center justify-center">
                    <Spin />
                </div>
            ) : !hasData ? (
                <div className="flex h-72 items-center justify-center">
                    <Empty description="Chưa có chi tiêu trong tháng này" />
                </div>
            ) : (
                <div className="flex">
                    <div
                        aria-hidden
                        className="relative shrink-0 text-[11px] text-muted-foreground tabular-nums"
                        style={{ width: Y_AXIS_WIDTH, height: chartHeight }}
                    >
                        {yTicks.map((tick) => (
                            <span
                                key={tick}
                                className="absolute right-1 -translate-y-1/2 whitespace-nowrap"
                                style={{ top: PLOT_PADDING_TOP + plotHeight * (1 - tick / yMax) }}
                            >
                                {formatCompact(tick)}
                            </span>
                        ))}
                    </div>
                    <div className="min-w-0 flex-1 overflow-x-auto overscroll-x-contain">
                        <div style={{ height: chartHeight, minWidth: chartMinWidth }}>
                            <Column
                                key={`${isDark ? "dark" : "light"}-${chartHeight}`}
                                {...config}
                                height={chartHeight}
                                autoFit
                                onReady={handleChartReady}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
