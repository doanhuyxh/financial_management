"use client";

import { useMemo } from "react";
import { DatePicker, Skeleton, Spin, Tag } from "antd";
import { ArrowDownLeft, ArrowUpRight, PiggyBank, Scale } from "lucide-react";
import { useDashboardContext } from "@/components/features/dashboard/context";
import StatTile from "@/components/features/dashboard/components/stat-tile";
import ChangeText from "@/components/features/dashboard/components/month-summary/components/change-text";
import { formatMoney, formatPercent } from "@/libs/utils/formatMoney";

/** % thay đổi; null khi kỳ so sánh bằng 0 (không so được). */
function getChangeRatio(current: number, previous: number | undefined) {
    if (!previous) return null;
    return (current - previous) / Math.abs(previous);
}

/**
 * Thu / chi / ròng / tỷ lệ tiết kiệm của tháng đang chọn.
 * Tháng đang chạy so với cùng kỳ tháng trước (ngày 1 → cùng ngày); tháng đã qua so với cả tháng trước.
 */
export default function MonthSummary() {
    const {
        monthValue,
        summary,
        isLoading,
        cashflow,
        isCashflowLoading,
        handleChangeMonth,
    } = useDashboardContext();

    const samePeriod = cashflow?.samePeriodPrevious ?? null;
    const compare = samePeriod ?? cashflow?.previous ?? undefined;
    const prevMonth = monthValue.subtract(1, "month");
    const compareLabel = samePeriod
        ? `cùng kỳ (01–${String(samePeriod.toDay).padStart(2, "0")}/${prevMonth.format("MM")})`
        : "tháng trước";

    const extra = useMemo(() => {
        if (!summary || !cashflow) return null;
        const days = cashflow.period.daysElapsed;
        const peakDay = summary.byDay.reduce<(typeof summary.byDay)[number] | null>(
            (peak, item) => (item.total > (peak?.total ?? 0) ? item : peak),
            null,
        );
        return {
            avgPerDay: days ? cashflow.totalExpense / days : 0,
            peakDay,
        };
    }, [summary, cashflow]);

    const money = (value: number | undefined) =>
        isCashflowLoading || value === undefined ? (
            <Skeleton.Input active size="small" />
        ) : (
            formatMoney(value)
        );

    const net = cashflow?.net ?? 0;
    const savingsRate = cashflow?.savingsRate ?? null;

    let subtitle = "";
    if (cashflow) {
        const { daysElapsed, daysInMonth, isCurrentMonth } = cashflow.period;
        subtitle = isCurrentMonth
            ? `Đã qua ${daysElapsed}/${daysInMonth} ngày · so với ${compareLabel}`
            : "So với cả tháng trước";
    }

    return (
        <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h2 className="text-base font-semibold">Tháng {monthValue.format("MM/YYYY")}</h2>
                    <p className="text-xs text-muted-foreground">{subtitle || " "}</p>
                </div>
                <div className="flex w-full items-center gap-2 sm:w-auto">
                    {isLoading || isCashflowLoading ? <Spin size="small" /> : null}
                    <DatePicker
                        inputReadOnly
                        picker="month"
                        value={monthValue}
                        onChange={handleChangeMonth}
                        format="MM/YYYY"
                        allowClear={false}
                        className="flex-1 sm:w-32 sm:flex-none"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                <StatTile
                    label="Thu nhập"
                    icon={<ArrowDownLeft className="size-4 text-money-in" />}
                    value={money(cashflow?.totalIncome)}
                    valueClassName="text-money-in"
                    description={
                        cashflow ? (
                            <ChangeText
                                ratio={getChangeRatio(cashflow.totalIncome, compare?.totalIncome)}
                                higherIsBetter
                                compareLabel={compareLabel}
                            />
                        ) : null
                    }
                />
                <StatTile
                    label="Chi tiêu"
                    icon={<ArrowUpRight className="size-4 text-money-out" />}
                    value={money(cashflow?.totalExpense)}
                    valueClassName="text-money-out"
                    description={
                        cashflow ? (
                            <ChangeText
                                ratio={getChangeRatio(cashflow.totalExpense, compare?.totalExpense)}
                                higherIsBetter={false}
                                compareLabel={compareLabel}
                            />
                        ) : null
                    }
                />
                <StatTile
                    label="Dòng tiền ròng"
                    icon={<Scale className="size-4 text-muted-foreground" />}
                    value={money(cashflow?.net)}
                    valueClassName={net < 0 ? "text-debt" : "text-money-in"}
                    description={
                        extra ? (
                            <>
                                TB chi <span className="money-value">{formatMoney(extra.avgPerDay)}</span>/ngày
                                {extra.peakDay ? (
                                    <>
                                        {" · "}nhiều nhất {extra.peakDay.label}/
                                        {monthValue.format("MM")}
                                    </>
                                ) : null}
                            </>
                        ) : null
                    }
                />
                <StatTile
                    label="Tỷ lệ tiết kiệm"
                    icon={<PiggyBank className="size-4 text-muted-foreground" />}
                    value={
                        isCashflowLoading || !cashflow ? (
                            <Skeleton.Input active size="small" />
                        ) : savingsRate === null ? (
                            "—"
                        ) : (
                            formatPercent(savingsRate)
                        )
                    }
                    valueClassName={(savingsRate ?? 0) < 0 ? "text-warn" : "text-money-in"}
                    description={
                        savingsRate === null ? (
                            "Chưa có thu nhập trong tháng"
                        ) : savingsRate < 0 ? (
                            <span className="flex flex-wrap items-center gap-1">
                                Chi nhiều hơn thu
                                <Tag color="warning" className="m-0">
                                    Cảnh báo
                                </Tag>
                            </span>
                        ) : (
                            "Dòng tiền ròng / thu nhập"
                        )
                    }
                />
            </div>
        </section>
    );
}
