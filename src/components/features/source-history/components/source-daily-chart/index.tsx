"use client";

import { useMemo, useState } from "react";
import dayjs, { type Dayjs } from "dayjs";
import BarChart, { type IBarGroup, type IBarSeries } from "@/components/common/bar-chart";
import DatePicker from "@/components/common/date-picker";
import EmptyState from "@/components/common/empty-state";
import { Skeleton } from "@/components/shadcn/ui/skeleton";
import { Spinner } from "@/components/shadcn/ui/spinner";
import { useGetSourceDailyTotals } from "@/libs/hooks/customHooks/useSourcesOfMoney";
import type { ISourceDailyTotal } from "@/libs/interfaces/sourceTransactionsData";

type SeriesField = keyof Omit<ISourceDailyTotal, "date">;

const SERIES: (IBarSeries & { key: SeriesField })[] = [
    // Plan 21 F: chi xám (không đỏ), thu xanh lá dịu; điều chỉnh xám nhạt để tách khỏi chi
    { key: "expense", label: "Chi", colorClassName: "bg-chart-out-strong" },
    { key: "income", label: "Thu", colorClassName: "bg-chart-in", textClassName: "text-money-in" },
    { key: "transfer", label: "Chuyển", colorClassName: "bg-primary", textClassName: "text-accent-text" },
    { key: "adjustment", label: "Điều chỉnh", colorClassName: "bg-chart-out" },
    { key: "rollover", label: "Đáo hạn", colorClassName: "bg-warn", textClassName: "text-warn" },
];

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

    // Đáo hạn chỉ có ở thẻ tín dụng
    const series = useMemo(
        () => (isCreditCard ? SERIES : SERIES.filter((item) => item.key !== "rollover")),
        [isCreditCard],
    );
    const days = useMemo(() => data?.data?.days ?? [], [data]);
    const hasData = days.some((day) => series.some((item) => day[item.key] > 0));
    const groups = useMemo<IBarGroup[]>(
        () =>
            days.map((day) => {
                const dayNumber = Number(day.date.slice(8));
                return {
                    key: day.date,
                    label: dayNumber,
                    title: `Ngày ${dayNumber}/${month.format("MM/YYYY")}`,
                    values: Object.fromEntries(series.map((item) => [item.key, day[item.key]])),
                };
            }),
        [days, series, month],
    );

    return (
        <section className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
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
                // Tháng 31 ngày × 5 cột: mobile cho cuộn ngang thay vì ép cột quá mảnh
                <BarChart
                    series={series}
                    groups={groups}
                    legend
                    clipOutliers
                    // Tháng hiện tại: mở ở hôm nay; tháng khác không khớp ngày nào nên mở từ đầu
                    scrollToKey={dayjs().format("YYYY-MM-DD")}
                    heightClassName="h-56"
                    barClassName="max-w-2"
                    mobileMinWidthClassName="min-w-160"
                />
            )}
        </section>
    );
}
