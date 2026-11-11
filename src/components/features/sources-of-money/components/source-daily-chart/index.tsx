"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import dayjs, { type Dayjs } from "dayjs";
import DatePicker from "@/components/common/date-picker";
import EmptyState from "@/components/common/empty-state";
import { Skeleton } from "@/components/shadcn/ui/skeleton";
import { Spinner } from "@/components/shadcn/ui/spinner";
import { THEME_COLORS } from "@/libs/constants/themeColors";
import { useGetSourceDailyTotals } from "@/libs/hooks/customHooks/useSourcesOfMoney";
import { useIsDarkMode } from "@/libs/hooks/useIsDarkMode";
import { useIsMobile } from "@/libs/hooks/use-mobile";
import type { ISourceDailyTotal } from "@/libs/interfaces/sourceTransactionsData";
import { formatCompactMoney, formatMoney } from "@/libs/utils/formatMoney";

// G2 nặng: tải chunk riêng, chỉ phía client.
const Column = dynamic(() => import("@ant-design/plots").then((mod) => mod.Column), {
    ssr: false,
    loading: () => <Skeleton className="skeleton-shimmer h-56 w-full animate-none" />,
});

type SeriesField = keyof Omit<ISourceDailyTotal, "date">;
type ThemeColors = (typeof THEME_COLORS)[keyof typeof THEME_COLORS];

const SERIES: { field: SeriesField; label: string; color: (c: ThemeColors) => string }[] = [
    { field: "expense", label: "Chi", color: (c) => c.moneyOut },
    { field: "income", label: "Thu", color: (c) => c.moneyIn },
    { field: "transfer", label: "Chuyển", color: (c) => c.credit },
    { field: "adjustment", label: "Điều chỉnh", color: (c) => c.muted },
    { field: "rollover", label: "Đáo hạn", color: (c) => c.warn },
];

const formatCurrency = (value: number) => formatMoney(value);
const formatCompact = (value: number) => formatCompactMoney(value);

interface ISourceDailyChartProps {
    sourceId: string;
    isCreditCard: boolean;
    /** Tháng mở đầu (YYYY-MM-DD bất kỳ trong tháng); không có thì tháng hiện tại. */
    initialDay?: string;
}

/** Biểu đồ cột theo ngày trong một tháng: mỗi ngày một nhóm cột Chi/Thu/Chuyển/Điều chỉnh/Đáo hạn. */
export default function SourceDailyChart({ sourceId, isCreditCard, initialDay }: ISourceDailyChartProps) {
    const [month, setMonth] = useState<Dayjs>(() =>
        (initialDay ? dayjs(initialDay) : dayjs()).startOf("month"),
    );
    const monthKey = month.format("YYYY-MM");
    const { data, isLoading, isFetching } = useGetSourceDailyTotals(sourceId, monthKey);
    const isDark = useIsDarkMode();
    const isMobile = useIsMobile();
    const chartHeight = isMobile ? 220 : 260;

    // Đáo hạn chỉ có ở thẻ tín dụng
    const series = useMemo(
        () => (isCreditCard ? SERIES : SERIES.filter((item) => item.field !== "rollover")),
        [isCreditCard],
    );
    const days = data?.data?.days ?? [];
    const hasData = days.some((day) => series.some((item) => day[item.field] > 0));

    const config = useMemo(() => {
        const colors = THEME_COLORS[isDark ? "dark" : "light"];
        const tickFill = colors.muted;
        const gridStroke = colors.border;
        return {
            data: days.flatMap((day) =>
                series.map((item) => ({
                    day: String(Number(day.date.slice(8))),
                    type: item.label,
                    value: day[item.field],
                })),
            ),
            theme: isDark ? "classicDark" : "classic",
            xField: "day",
            yField: "value",
            colorField: "type",
            group: true,
            scale: {
                color: {
                    domain: series.map((item) => item.label),
                    range: series.map((item) => item.color(colors)),
                },
            },
            axis: {
                x: {
                    title: false,
                    labelFill: tickFill,
                    labelFontSize: 10,
                    tickStroke: tickFill,
                    lineStroke: gridStroke,
                },
                y: {
                    title: false,
                    labelFill: tickFill,
                    labelFontSize: 10,
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
            style: { radiusTopLeft: 2, radiusTopRight: 2 },
            interaction: { tooltip: { shared: true } },
            tooltip: {
                title: (datum: { day: string }) => `Ngày ${datum.day}/${month.format("MM/YYYY")}`,
                items: [{ field: "value", valueFormatter: formatCurrency }],
            },
        };
    }, [days, series, isDark, month]);

    return (
        <div className="flex flex-col gap-2 rounded-md border px-3 py-2">
            <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">Biến động theo ngày</span>
                <div className="flex items-center gap-2">
                    {isFetching ? <Spinner className="shrink-0 text-primary" /> : null}
                    <DatePicker
                        picker="month"
                        value={month}
                        onChange={(value) => value && setMonth(value.startOf("month"))}
                        format="MM/YYYY"
                        allowClear={false}
                        size="sm"
                        aria-label="Chọn tháng của biểu đồ"
                        className="w-32"
                    />
                </div>
            </div>
            {isLoading ? (
                <Skeleton className="skeleton-shimmer h-56 w-full animate-none" />
            ) : !hasData ? (
                <div className="flex h-40 items-center justify-center">
                    <EmptyState description={`Không có giao dịch trong tháng ${month.format("MM/YYYY")}`} />
                </div>
            ) : (
                // Tháng 31 ngày × 5 cột: mobile cho cuộn ngang thay vì ép cột quá mảnh;
                // desktop không cuộn để tooltip không bị cắt
                <div className={isMobile ? "overflow-x-auto pb-1" : undefined}>
                    <div
                        className={isMobile ? "money-value min-w-160" : "money-value"}
                        style={{ height: chartHeight }}
                    >
                        <Column
                            key={`${isDark ? "dark" : "light"}-${chartHeight}`}
                            {...config}
                            height={chartHeight}
                            autoFit
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
