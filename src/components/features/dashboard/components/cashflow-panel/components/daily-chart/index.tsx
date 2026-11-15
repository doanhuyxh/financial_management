"use client";

import { useMemo } from "react";
import EmptyState from "@/components/common/empty-state";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/shadcn/ui/tooltip";
import { useDashboardContext } from "@/components/features/dashboard/context";
import { useIsMobile } from "@/libs/hooks/use-mobile";
import { cn } from "@/libs/shadcn/utils";
import { formatCompactMoney, formatMoney } from "@/libs/utils/formatMoney";

/** Số vạch ngang (không tính vạch 0). */
const GRID_STEPS = 4;

/** Làm tròn lên mốc "đẹp" (1, 2, 2.5, 5 × 10^n) để trục dễ đọc. */
function niceMax(value: number) {
    if (value <= 0) return 1;
    const magnitude = 10 ** Math.floor(Math.log10(value));
    const step = [1, 2, 2.5, 5, 10].find((item) => item * magnitude >= value) ?? 10;
    return step * magnitude;
}

/**
 * Thu và chi của mọi ngày trong tháng: mỗi ngày hai cột (thu xanh, chi đỏ), ngày chưa tới để trống.
 * Bấm một ngày để mở danh sách chi tiêu ngày đó.
 */
export default function DailyChart() {
    const { summary, cashflow, monthValue, handleViewDay } = useDashboardContext();
    const isMobile = useIsMobile();

    const { days, max } = useMemo(() => {
        const incomeByDay = new Map((cashflow?.incomeByDay ?? []).map((item) => [item.day, item.total]));
        const elapsed = cashflow?.period.daysElapsed ?? 0;
        const list: { day: number; expense: number; income: number; past: boolean; cumulative: number }[] = [];
        for (const item of summary?.byDay ?? []) {
            const income = incomeByDay.get(item.day) ?? 0;
            const past = item.day <= elapsed;
            const previous = list[list.length - 1]?.cumulative ?? 0;
            list.push({
                day: item.day,
                expense: item.total,
                income,
                past,
                cumulative: past ? previous + income - item.total : previous,
            });
        }
        const peak = Math.max(0, ...list.map((item) => Math.max(item.expense, item.income)));
        return { days: list, max: niceMax(peak) };
    }, [summary, cashflow]);

    if (days.length === 0) return <EmptyState description="Chưa có số liệu của tháng này" />;

    const today = cashflow?.period.isCurrentMonth ? cashflow.period.daysElapsed : null;
    const month = monthValue.format("MM");
    const height = (value: number) => (value ? `${Math.max(1.5, (value / max) * 100)}%` : "0%");

    return (
        // Mobile: ~30 ngày × 2 cột không vừa chiều ngang nên cho cuộn ngang
        <div className={isMobile ? "overflow-x-auto pb-1" : undefined}>
            <div className={cn("flex gap-2", isMobile && "min-w-160")}>
                <div className="flex h-64 w-10 shrink-0 flex-col-reverse justify-between text-right text-[10px] leading-none text-muted-foreground tabular-nums">
                    {Array.from({ length: GRID_STEPS + 1 }, (_, index) => (
                        <span key={index} className="money-value -translate-y-1/2 first:translate-y-0">
                            {index === 0 ? "0" : formatCompactMoney((max * index) / GRID_STEPS)}
                        </span>
                    ))}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="relative h-64 border-b border-border">
                        {Array.from({ length: GRID_STEPS }, (_, index) => (
                            <span
                                key={index}
                                aria-hidden
                                className="absolute inset-x-0 border-t border-border/60"
                                style={{ bottom: `${((index + 1) / GRID_STEPS) * 100}%` }}
                            />
                        ))}
                        <div className="relative flex h-full items-end">
                            {days.map((item) => (
                                <Tooltip key={item.day}>
                                    <TooltipTrigger asChild>
                                        <button
                                            type="button"
                                            disabled={!item.past}
                                            aria-label={`Ngày ${item.day}/${month}: thu ${formatMoney(item.income)}, chi ${formatMoney(item.expense)}`}
                                            onClick={() => handleViewDay(item.day)}
                                            className={cn(
                                                "group flex h-full min-w-0 flex-1 items-end justify-center gap-px px-px sm:gap-0.5",
                                                item.past ? "cursor-pointer hover:bg-muted/60" : "cursor-default",
                                                item.day === today && "border-r border-dashed border-primary/60",
                                            )}
                                        >
                                            <span
                                                className="w-full max-w-3 rounded-t-sm bg-money-in/85 group-hover:bg-money-in"
                                                style={{ height: height(item.income) }}
                                            />
                                            <span
                                                className="w-full max-w-3 rounded-t-sm bg-money-out/85 group-hover:bg-money-out"
                                                style={{ height: height(item.expense) }}
                                            />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        {item.past ? (
                                            <div className="money-value flex flex-col gap-0.5 tabular-nums">
                                                <span className="font-semibold">
                                                    Ngày {item.day}/{month}
                                                </span>
                                                <span>Thu: {formatMoney(item.income)}</span>
                                                <span>Chi: {formatMoney(item.expense)}</span>
                                                <span>Ròng ngày: {formatMoney(item.income - item.expense)}</span>
                                                <span>Ròng lũy kế: {formatMoney(item.cumulative)}</span>
                                            </div>
                                        ) : (
                                            `Ngày ${item.day}/${month} · chưa tới`
                                        )}
                                    </TooltipContent>
                                </Tooltip>
                            ))}
                        </div>
                    </div>
                    <div className="mt-1 flex">
                        {days.map((item) => (
                            <span
                                key={item.day}
                                className={cn(
                                    "min-w-0 flex-1 text-center text-[10px] leading-none tabular-nums",
                                    item.day === today
                                        ? "font-semibold text-accent-text"
                                        : item.past
                                          ? "text-muted-foreground"
                                          : "text-muted-foreground/50",
                                )}
                            >
                                {item.day}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
