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
    { key: "income", label: "Thu", colorClassName: "bg-chart-in", textClassName: "text-money-in" },
    { key: "expense", label: "Chi", colorClassName: "bg-chart-out" },
];

/** Ngày chi vượt mức này × trung bình các ngày có chi thì tô đậm (plan 21 F). */
const SPIKE_RATIO = 1.8;

/**
 * Thu và chi của mọi ngày trong tháng: mỗi ngày hai cột, ngày chưa tới để trống. Chi tiêu thường là
 * cột xám (không đỏ — plan 21); chỉ ngày chi bất thường (> 1,8 × trung bình ngày có chi) tô đậm để mắt
 * dừng đúng chỗ. Bấm một ngày để mở danh sách chi tiêu ngày đó.
 */
export default function DailyChart() {
    const { summary, cashflow, monthValue, handleViewDay } = useDashboardContext();
    const month = monthValue.format("MM");
    const today = cashflow?.period.isCurrentMonth ? cashflow.period.daysElapsed : null;

    const groups = useMemo<IBarGroup[]>(() => {
        const incomeByDay = new Map((cashflow?.incomeByDay ?? []).map((item) => [item.day, item.total]));
        const elapsed = cashflow?.period.daysElapsed ?? 0;
        const spentDays = (summary?.byDay ?? []).filter((item) => item.day <= elapsed && item.total > 0);
        const avgSpent = spentDays.length
            ? spentDays.reduce((sum, item) => sum + item.total, 0) / spentDays.length
            : 0;
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
                colorClassNames:
                    past && avgSpent > 0 && expense > avgSpent * SPIKE_RATIO
                        ? { expense: "bg-chart-out-strong" }
                        : undefined,
                onClick: () => handleViewDay(item.day),
                ariaLabel: `Ngày ${item.day}/${month}: thu ${formatMoney(income)}, chi ${formatMoney(expense)}`,
                labelClassName:
                    item.day === today ? "font-semibold text-accent-text" : past ? undefined : "text-muted-foreground/50",
                tooltip: past ? (
                    <div className="money-value flex min-w-48 flex-col gap-1 tabular-nums">
                        <span className="font-semibold">
                            Ngày {item.day}/{month}
                        </span>
                        <ChartTooltipRow label="Thu" value={income} dotClassName="bg-chart-in" valueClassName="text-money-in" />
                        <ChartTooltipRow label="Chi" value={expense} dotClassName="bg-chart-out-strong" />
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
    return (
        <BarChart
            series={SERIES}
            groups={groups}
            clipOutliers
            scrollToKey={today ? String(today) : undefined}
            mobileMinWidthClassName="min-w-160"
        />
    );
}
