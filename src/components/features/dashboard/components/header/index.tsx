"use client";

import { useMemo } from "react";
import { Button, DatePicker, Skeleton, Spin } from "antd";
import dayjs from "dayjs";
import { CalendarArrowUp, Plus, Tags, TrendingUp, Wallet } from "lucide-react";
import { useDashboardContext } from "@/components/features/dashboard/context";
import MiniStat from "@/components/features/dashboard/components/mini-stat";

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
});

export default function DashboardHeader() {
    const { monthValue, summary, isLoading, handleChangeMonth, handleCreateExpense } =
        useDashboardContext();

    const stats = useMemo(() => {
        if (!summary) return null;

        // Average over days elapsed: whole month for past months, up to today for the current one.
        const today = dayjs();
        const daysCounted = monthValue.isSame(today, "month")
            ? today.date()
            : monthValue.isAfter(today, "month")
              ? 0
              : monthValue.daysInMonth();

        const peakDay = summary.byDay.reduce<(typeof summary.byDay)[number] | null>(
            (peak, item) => (item.total > (peak?.total ?? 0) ? item : peak),
            null,
        );

        return {
            avgPerDay: daysCounted ? summary.totalAmount / daysCounted : 0,
            peakDay,
            categoryCount: summary.byCategory.length,
        };
    }, [summary, monthValue]);

    return (
        <div className="relative overflow-hidden rounded-xl border border-primary/25 bg-linear-to-br from-primary/15 via-primary/5 to-transparent p-4 sm:p-5">
            <div
                aria-hidden
                className="pointer-events-none absolute -top-12 -right-12 size-40 rounded-full bg-primary/10 blur-2xl"
            />

            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                        <Wallet className="size-6" />
                    </span>
                    <div className="min-w-0">
                        <p className="text-sm text-muted-foreground">
                            Tổng chi tiêu tháng {monthValue.format("MM/YYYY")}
                        </p>
                        {summary ? (
                            <p className="truncate text-2xl font-bold tracking-tight tabular-nums sm:text-3xl">
                                {currencyFormatter.format(summary.totalAmount)}
                            </p>
                        ) : (
                            <Skeleton.Input active size="large" className="mt-1" />
                        )}
                    </div>
                </div>

                {/* Controls live inside the card so the header reads as one block */}
                <div className="flex items-center gap-2 sm:shrink-0">
                    {isLoading ? <Spin size="small" /> : null}
                    <DatePicker
                        picker="month"
                        value={monthValue}
                        onChange={handleChangeMonth}
                        format="MM/YYYY"
                        allowClear={false}
                        className="flex-1 sm:w-32 sm:flex-none"
                    />
                    <Button
                        type="primary"
                        icon={<Plus className="size-4" />}
                        onClick={handleCreateExpense}
                    >
                        Thêm chi tiêu
                    </Button>
                </div>
            </div>

            {stats ? (
                <div className="relative mt-4 grid grid-cols-1 gap-3 border-t border-primary/15 pt-4 sm:grid-cols-3">
                    <MiniStat
                        icon={<TrendingUp className="size-4" />}
                        label="Trung bình / ngày"
                        value={currencyFormatter.format(stats.avgPerDay)}
                    />
                    <MiniStat
                        icon={<CalendarArrowUp className="size-4" />}
                        label="Ngày chi nhiều nhất"
                        value={
                            stats.peakDay
                                ? `${stats.peakDay.label}/${monthValue.format("MM")} · ${currencyFormatter.format(stats.peakDay.total)}`
                                : "—"
                        }
                    />
                    <MiniStat
                        icon={<Tags className="size-4" />}
                        label="Số danh mục đã chi"
                        value={stats.categoryCount}
                    />
                </div>
            ) : null}
        </div>
    );
}
