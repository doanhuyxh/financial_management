"use client";

import { useMemo } from "react";
import { Button, DatePicker, Skeleton, Spin } from "antd";
import dayjs from "dayjs";
import { CalendarArrowUp, CreditCard, Plus, Tags, TrendingUp, Wallet } from "lucide-react";
import { useDashboardContext } from "@/components/features/dashboard/context";
import MiniStat from "@/components/features/dashboard/components/mini-stat";
import { formatMoney } from "@/libs/utils/formatMoney";

export default function DashboardHeader() {
    const {
        monthValue,
        summary,
        isLoading,
        totalCreditDebt,
        isSourcesLoading,
        handleChangeMonth,
        handleCreateExpense,
    } = useDashboardContext();

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
                <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:gap-6">
                    <div className="flex min-w-0 items-center gap-4">
                        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                            <Wallet className="size-6" />
                        </span>
                        <div className="min-w-0">
                            <p className="text-sm text-muted-foreground">
                                Tổng chi tiêu tháng {monthValue.format("MM/YYYY")}
                            </p>
                            {summary ? (
                                <p className="text-xl font-bold tracking-tight wrap-break-word text-primary tabular-nums sm:text-3xl">
                                    {formatMoney(summary.totalAmount)}
                                </p>
                            ) : (
                                <Skeleton.Input active size="large" className="mt-1" />
                            )}
                        </div>
                    </div>

                    <span
                        aria-hidden
                        className="hidden h-10 w-px shrink-0 bg-primary/25 lg:block"
                    />

                    <div className="flex min-w-0 items-center gap-4">
                        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-red-500">
                            <CreditCard className="size-6" />
                        </span>
                        <div className="min-w-0">
                            <p className="text-sm text-muted-foreground">
                                Tổng dư nợ thẻ tín dụng hiện tại
                            </p>
                            {isSourcesLoading ? (
                                <Skeleton.Input active size="large" className="mt-1" />
                            ) : (
                                <p className="text-xl font-bold tracking-tight wrap-break-word text-red-500 tabular-nums sm:text-3xl">
                                    {formatMoney(totalCreditDebt)}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Controls live inside the card so the header reads as one block */}
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:shrink-0 sm:flex-row sm:items-center">
                    {isLoading ? <Spin size="small" /> : null}
                    <DatePicker
                        inputReadOnly
                        picker="month"
                        value={monthValue}
                        onChange={handleChangeMonth}
                        format="MM/YYYY"
                        allowClear={false}
                        className="w-full sm:w-32"
                    />
                    <Button
                        type="primary"
                        className="w-full sm:w-auto"
                        icon={<Plus className="size-4" />}
                        onClick={handleCreateExpense}
                    >
                        Thêm chi tiêu
                    </Button>
                </div>
            </div>

            {stats ? (
                <div className="relative mt-4 grid grid-cols-2 gap-3 border-t border-primary/15 pt-4 sm:grid-cols-3">
                    <MiniStat
                        icon={<TrendingUp className="size-4" />}
                        label="Trung bình / ngày"
                        value={formatMoney(stats.avgPerDay)}
                    />
                    <MiniStat
                        icon={<CalendarArrowUp className="size-4" />}
                        label="Ngày chi nhiều nhất"
                        value={
                            stats.peakDay
                                ? `${stats.peakDay.label}/${monthValue.format("MM")} · ${formatMoney(stats.peakDay.total)}`
                                : "—"
                        }
                    />
                    <div className="col-span-2 sm:col-span-1">
                        <MiniStat
                            icon={<Tags className="size-4" />}
                            label="Số danh mục đã chi"
                            value={stats.categoryCount}
                        />
                    </div>
                </div>
            ) : null}
        </div>
    );
}
