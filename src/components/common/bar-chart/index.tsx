"use client";

import { useMemo, type ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/shadcn/ui/tooltip";
import { useIsMobile } from "@/libs/hooks/use-mobile";
import { cn } from "@/libs/shadcn/utils";
import { formatCompactMoney, formatMoney } from "@/libs/utils/formatMoney";

/** Số vạch ngang (không tính vạch 0). */
const GRID_STEPS = 4;

const NICE_STEPS = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];

/**
 * Đỉnh trục Y = bước "đẹp" × số vạch, để mọi vạch là số tròn (VD 1,5 / 3 / 4,5 / 6 Tr),
 * không ra mốc lẻ kiểu 1,3 Tr / 3,8 Tr khi chia đều một đỉnh tròn.
 */
export function niceMax(value: number) {
    if (value <= 0) return GRID_STEPS;
    const raw = value / GRID_STEPS;
    const magnitude = 10 ** Math.floor(Math.log10(raw));
    const step = (NICE_STEPS.find((item) => item * magnitude >= raw) ?? 10) * magnitude;
    return step * GRID_STEPS;
}

export interface IBarSeries {
    key: string;
    label: string;
    /** Class nền theo token, VD "bg-money-in" */
    colorClassName: string;
    /** Class màu chữ số tiền trong tooltip, VD "text-money-in"; không có thì màu chữ thường */
    textClassName?: string;
}

/** Màu chữ cho số tiền ròng: dương xanh, âm đỏ, 0 xám */
export function netTextClassName(value: number) {
    if (value > 0) return "text-money-in";
    if (value < 0) return "text-money-out";
    return "text-muted-foreground";
}

/** Tooltip biểu đồ nền thẻ (không đảo màu) để màu theo nghĩa đọc rõ ở cả sáng và tối */
export const CHART_TOOLTIP_CLASS = "flex-col items-stretch gap-1 bg-popover px-3 py-2 text-popover-foreground shadow-md ring-1 ring-foreground/10";
export const CHART_TOOLTIP_ARROW_CLASS = "bg-popover fill-popover";

/** Một dòng tooltip: chấm màu · nhãn · số tiền canh phải */
export function ChartTooltipRow({
    label,
    value,
    dotClassName,
    valueClassName,
}: {
    label: ReactNode;
    value: number;
    dotClassName?: string;
    valueClassName?: string;
}) {
    return (
        <span className="grid grid-cols-[auto_1fr_auto] items-center gap-x-2">
            <span aria-hidden className={cn("size-2 rounded-xs", dotClassName ?? "bg-transparent")} />
            <span className="text-muted-foreground">{label}</span>
            {/* Số 0 để xám: không tô màu nghĩa cho dòng không có giao dịch */}
            <span className={cn("text-right font-semibold", value === 0 ? "text-muted-foreground" : valueClassName)}>
                {formatMoney(value)}
            </span>
        </span>
    );
}

export interface IBarGroup {
    key: string;
    /** Nhãn trục X */
    label: ReactNode;
    /** Giá trị theo `IBarSeries.key`; thiếu = 0 */
    values: Record<string, number>;
    /** Tiêu đề tooltip mặc định; không có thì dùng `label` */
    title?: ReactNode;
    /** Nội dung tooltip tự viết (thay danh sách series mặc định) */
    tooltip?: ReactNode;
    ariaLabel?: string;
    onClick?: () => void;
    disabled?: boolean;
    /** Vạch đứt đánh dấu (VD hôm nay) */
    highlight?: boolean;
    labelClassName?: string;
}

interface IBarChartProps {
    series: IBarSeries[];
    groups: IBarGroup[];
    /** Chiều cao vùng vẽ (class Tailwind) */
    heightClassName?: string;
    /** Bề rộng tối đa mỗi cột (class Tailwind) */
    barClassName?: string;
    /** Bề rộng tối thiểu trên mobile để cuộn ngang khi nhiều cột, VD "min-w-160" */
    mobileMinWidthClassName?: string;
    legend?: boolean;
    className?: string;
}

/**
 * Biểu đồ cột nhóm vẽ bằng div + CSS (không thư viện biểu đồ): màu theo token nên tự đúng sáng/tối,
 * số tiền có class `money-value` cho chế độ ẩn số dư, cột mọc từ dưới lên khi hiện (`bar-grow`).
 */
export default function BarChart({
    series,
    groups,
    heightClassName = "h-64",
    barClassName = "max-w-3",
    mobileMinWidthClassName,
    legend = false,
    className,
}: IBarChartProps) {
    const isMobile = useIsMobile();
    const max = useMemo(() => {
        const peak = Math.max(0, ...groups.flatMap((group) => series.map((item) => group.values[item.key] ?? 0)));
        return niceMax(peak);
    }, [groups, series]);
    const height = (value: number) => (value > 0 ? `${Math.max(1.5, (value / max) * 100)}%` : "0%");
    const scroll = isMobile && mobileMinWidthClassName;

    return (
        <div className={cn("flex flex-col gap-2", className)}>
            {legend ? (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {series.map((item) => (
                        <span key={item.key} className="inline-flex items-center gap-1.5">
                            <span aria-hidden className={cn("size-2.5 rounded-xs", item.colorClassName)} />
                            {item.label}
                        </span>
                    ))}
                </div>
            ) : null}
            <div className={scroll ? "overflow-x-auto pb-1" : undefined}>
                {/* pt: nhãn trục Y trên cùng dịch lên nửa dòng, chừa chỗ để không bị cắt */}
                <div className={cn("flex gap-2 pt-1.5", scroll && mobileMinWidthClassName)}>
                    <div
                        className={cn(
                            "flex w-10 shrink-0 flex-col-reverse justify-between text-right text-[10px] leading-none text-muted-foreground tabular-nums",
                            heightClassName,
                        )}
                    >
                        {Array.from({ length: GRID_STEPS + 1 }, (_, index) => (
                            <span key={index} className="money-value -translate-y-1/2 first:translate-y-0">
                                {index === 0 ? "0" : formatCompactMoney((max * index) / GRID_STEPS)}
                            </span>
                        ))}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className={cn("relative border-b border-border", heightClassName)}>
                            {Array.from({ length: GRID_STEPS }, (_, index) => (
                                <span
                                    key={index}
                                    aria-hidden
                                    className="absolute inset-x-0 border-t border-border/60"
                                    style={{ bottom: `${((index + 1) / GRID_STEPS) * 100}%` }}
                                />
                            ))}
                            <div className="relative flex h-full items-end">
                                {groups.map((group) => {
                                    const bars = (
                                        <span className="flex h-full w-full items-end justify-center gap-px sm:gap-0.5">
                                            {series.map((item) => (
                                                <span
                                                    key={item.key}
                                                    className={cn(
                                                        "bar-grow w-full rounded-t-sm opacity-85 group-hover:opacity-100",
                                                        barClassName,
                                                        item.colorClassName,
                                                    )}
                                                    style={{ height: height(group.values[item.key] ?? 0) }}
                                                />
                                            ))}
                                        </span>
                                    );
                                    const triggerClass = cn(
                                        "group flex h-full min-w-0 flex-1 items-end px-px outline-none focus-visible:bg-muted/60",
                                        group.disabled ? "cursor-default" : "hover:bg-muted/60",
                                        group.onClick && !group.disabled && "cursor-pointer",
                                        group.highlight && "border-r border-dashed border-primary/60",
                                    );
                                    return (
                                        <Tooltip key={group.key}>
                                            <TooltipTrigger asChild>
                                                {group.onClick ? (
                                                    <button
                                                        type="button"
                                                        disabled={group.disabled}
                                                        aria-label={group.ariaLabel}
                                                        onClick={group.onClick}
                                                        className={triggerClass}
                                                    >
                                                        {bars}
                                                    </button>
                                                ) : (
                                                    <div
                                                        tabIndex={0}
                                                        role="img"
                                                        aria-label={group.ariaLabel}
                                                        className={triggerClass}
                                                    >
                                                        {bars}
                                                    </div>
                                                )}
                                            </TooltipTrigger>
                                            <TooltipContent
                                                className={CHART_TOOLTIP_CLASS}
                                                arrowClassName={CHART_TOOLTIP_ARROW_CLASS}
                                            >
                                                {group.tooltip ?? (
                                                    <div className="money-value flex min-w-44 flex-col gap-1 tabular-nums">
                                                        <span className="font-semibold">{group.title ?? group.label}</span>
                                                        {series.map((item) => (
                                                            <ChartTooltipRow
                                                                key={item.key}
                                                                label={item.label}
                                                                value={group.values[item.key] ?? 0}
                                                                dotClassName={item.colorClassName}
                                                                valueClassName={item.textClassName}
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                            </TooltipContent>
                                        </Tooltip>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="mt-1 flex">
                            {groups.map((group) => (
                                <span
                                    key={group.key}
                                    className={cn(
                                        "min-w-0 flex-1 text-center text-[10px] leading-none text-muted-foreground tabular-nums",
                                        group.labelClassName,
                                    )}
                                >
                                    {group.label}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
