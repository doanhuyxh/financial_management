"use client";

import { useMemo } from "react";
import BarChart, {
    ChartTooltipRow,
    netTextClassName,
    type IBarGroup,
    type IBarSeries,
} from "@/components/common/bar-chart";
import EmptyState from "@/components/common/empty-state";
import { useDashboardContext } from "@/components/features/dashboard/context";
import { formatMoney } from "@/libs/utils/formatMoney";

const SERIES: IBarSeries[] = [
    { key: "income", label: "Thu", colorClassName: "bg-money-in", textClassName: "text-money-in" },
    { key: "expense", label: "Chi", colorClassName: "bg-money-out", textClassName: "text-money-out" },
];

/**
 * Thu và chi của mọi ngày trong tháng: mỗi ngày hai cột (thu xanh, chi đỏ), ngày chưa tới để trống.
 * Bấm một ngày để mở danh sách chi tiêu ngày đó.
 */
export default function DailyChart() {
    const { summary, cashflow, monthValue, handleViewDay } = useDashboardContext();
    const month = monthValue.format("MM");
    const today = cashflow?.period.isCurrentMonth ? cashflow.period.daysElapsed : null;

    const groups = useMemo<IBarGroup[]>(() => {
        const incomeByDay = new Map((cashflow?.incomeByDay ?? []).map((item) => [item.day, item.total]));
        const elapsed = cashflow?.period.daysElapsed ?? 0;
        const list: IBarGroup[] = [];
        let cumulative = 0;
        for (const item of summary?.byDay ?? []) {
            const income = incomeByDay.get(item.day) ?? 0;
            const expense = item.total;
            const past = item.day <= elapsed;
            if (past) cumulative += income - expense;
            list.push({
                key: String(item.day),
                label: item.day,
                values: { income, expense },
                disabled: !past,
                highlight: item.day === today,
                onClick: () => handleViewDay(item.day),
                ariaLabel: `Ngày ${item.day}/${month}: thu ${formatMoney(income)}, chi ${formatMoney(expense)}`,
                labelClassName:
                    item.day === today ? "font-semibold text-accent-text" : past ? undefined : "text-muted-foreground/50",
                tooltip: past ? (
                    <div className="money-value flex min-w-48 flex-col gap-1 tabular-nums">
                        <span className="font-semibold">
                            Ngày {item.day}/{month}
                        </span>
                        <ChartTooltipRow label="Thu" value={income} dotClassName="bg-money-in" valueClassName="text-money-in" />
                        <ChartTooltipRow label="Chi" value={expense} dotClassName="bg-money-out" valueClassName="text-money-out" />
                        <span aria-hidden className="my-0.5 border-t border-border" />
                        <ChartTooltipRow
                            label="Ròng ngày"
                            value={income - expense}
                            valueClassName={netTextClassName(income - expense)}
                        />
                        <ChartTooltipRow
                            label="Ròng lũy kế"
                            value={cumulative}
                            valueClassName={netTextClassName(cumulative)}
                        />
                    </div>
                ) : (
                    `Ngày ${item.day}/${month} · chưa tới`
                ),
            });
        }
        return list;
    }, [summary, cashflow, month, today, handleViewDay]);

    if (groups.length === 0) return <EmptyState description="Chưa có số liệu của tháng này" />;

    // Mobile: ~30 ngày × 2 cột không vừa chiều ngang nên cho cuộn ngang
    return <BarChart series={SERIES} groups={groups} mobileMinWidthClassName="min-w-160" />;
}
