"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent, type ReactNode } from "react";
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

/** Giá trị lớn hơn mức này × giá trị kế tiếp thì coi là đột biến (VD ngày nhận lương). */
const OUTLIER_RATIO = 2.5;
/** Tối đa số cột đột biến được cắt (VD hai kỳ lương trong tháng). */
const MAX_OUTLIERS = 2;

/**
 * Đỉnh dùng để chia trục khi cho cắt cột đột biến: bỏ qua tối đa `MAX_OUTLIERS` giá trị cao vượt hẳn
 * phần còn lại, để các cột nhỏ không bị ép thành vạch. Ít hơn 4 giá trị dương thì giữ đỉnh thật.
 */
export function axisPeak(values: number[]) {
    const sorted = values.filter((value) => value > 0).sort((a, b) => b - a);
    if (sorted.length >= 4) {
        for (let count = 1; count <= MAX_OUTLIERS; count += 1) {
            if (sorted[count - 1] > sorted[count] * OUTLIER_RATIO) return sorted[count];
        }
    }
    return sorted[0] ?? 0;
}

export interface IBarSeries {
    key: string;
    label: string;
    /** Class nền theo token, VD "bg-money-in" */
    colorClassName: string;
    /** Class màu chữ số tiền trong tooltip, VD "text-money-in"; không có thì màu chữ thường */
    textClassName?: string;
}

/** Màu chữ cho số tiền ròng: dương xanh, âm đỏ (cần chú ý), 0 xám */
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
    /** Đổi màu cột của riêng nhóm này theo `IBarSeries.key` (VD ngày chi bất thường tô đậm) */
    colorClassNames?: Partial<Record<string, string>>;
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
    /** Cắt cột cao đột biến (đánh dấu vạch đứt, số thật xem ở tooltip) để các cột còn lại đọc được */
    clipOutliers?: boolean;
    /** Khi biểu đồ cuộn ngang: mở ở vị trí thấy được nhóm này (VD hôm nay) */
    scrollToKey?: string;
    className?: string;
}

/**
 * Tooltip Radix chỉ mở bằng hover / focus bàn phím, nên trên cảm ứng phải tự mở khi chạm. Cột có
 * `onClick`: chạm lần đầu xem số, chạm lần nữa mới chạy `onClick`. Cột không có: chạm lần nữa để đóng.
 * Chuột và bàn phím giữ nguyên (bấm là chạy `onClick`).
 */
function useChartTooltip() {
    const [openKey, setOpenKey] = useState<string | null>(null);
    const touchRef = useRef<{ wasOpen: boolean } | null>(null);

    return (key: string, onClick?: () => void) => ({
        root: {
            open: openKey === key,
            onOpenChange: (open: boolean) =>
                setOpenKey((current) => (open ? key : current === key ? null : current)),
        },
        trigger: {
            // Ghi trạng thái trước khi Radix đóng tooltip ở pointerdown
            onPointerDown: (event: PointerEvent) => {
                touchRef.current = event.pointerType === "mouse" ? null : { wasOpen: openKey === key };
            },
            onClick: (event: MouseEvent) => {
                const touch = touchRef.current;
                touchRef.current = null;
                if (touch) {
                    // Chặn Radix đóng tooltip khi click
                    event.preventDefault();
                    if (!touch.wasOpen || !onClick) {
                        setOpenKey(touch.wasOpen ? null : key);
                        return;
                    }
                }
                onClick?.();
            },
        },
    });
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
    clipOutliers = false,
    scrollToKey,
    className,
}: IBarChartProps) {
    const isMobile = useIsMobile();
    const { max, clipped } = useMemo(() => {
        const values = groups.flatMap((group) => series.map((item) => group.values[item.key] ?? 0));
        const peak = Math.max(0, ...values);
        const axisMax = niceMax(clipOutliers ? axisPeak(values) : peak);
        return { max: axisMax, clipped: peak > axisMax };
    }, [groups, series, clipOutliers]);
    const height = (value: number) => (value > 0 ? `${Math.min(100, Math.max(1.5, (value / max) * 100))}%` : "0%");
    const scroll = Boolean(isMobile && mobileMinWidthClassName);
    const scrollRef = useRef<HTMLDivElement>(null);
    const scrollIndex = groups.findIndex((group) => group.key === scrollToKey);
    const groupCount = groups.length;

    useEffect(() => {
        const element = scrollRef.current;
        if (!element || !scroll || scrollIndex < 0) return;
        // Chừa thêm 2 nhóm bên phải để nhóm đích không nằm sát mép
        const right = (element.scrollWidth * (scrollIndex + 3)) / groupCount;
        element.scrollLeft = Math.max(0, right - element.clientWidth);
    }, [scroll, scrollIndex, groupCount]);
    const tooltipProps = useChartTooltip();

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
            {/* pt: nhãn trục Y trên cùng dịch lên nửa dòng, chừa chỗ để không bị cắt */}
            <div className="flex gap-2">
                {/* Trục Y nằm ngoài vùng cuộn để luôn nhìn thấy */}
                <div
                    className={cn(
                        "mt-1.5 flex w-10 shrink-0 flex-col-reverse justify-between text-right text-[10px] leading-none text-muted-foreground tabular-nums",
                        heightClassName,
                    )}
                >
                    {Array.from({ length: GRID_STEPS + 1 }, (_, index) => (
                        <span key={index} className="money-value -translate-y-1/2 first:translate-y-0">
                            {index === 0 ? "0" : formatCompactMoney((max * index) / GRID_STEPS)}
                        </span>
                    ))}
                </div>
                <div ref={scrollRef} className={cn("min-w-0 flex-1 pt-1.5", scroll && "overflow-x-auto pb-1")}>
                    <div className={scroll ? mobileMinWidthClassName : undefined}>
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
                                                        "bar-grow relative w-full rounded-t-sm opacity-85 group-hover:opacity-100",
                                                        barClassName,
                                                        group.colorClassNames?.[item.key] ?? item.colorClassName,
                                                    )}
                                                    style={{ height: height(group.values[item.key] ?? 0) }}
                                                >
                                                    {(group.values[item.key] ?? 0) > max ? (
                                                        // Vạch đứt: cột cao hơn trục
                                                        <span className="absolute -inset-x-px top-2 h-1 -skew-y-12 bg-card" />
                                                    ) : null}
                                                </span>
                                            ))}
                                        </span>
                                    );
                                    const triggerClass = cn(
                                        "group flex h-full min-w-0 flex-1 items-end px-px outline-none focus-visible:bg-muted/60",
                                        group.disabled ? "cursor-default" : "hover:bg-muted/60",
                                        group.onClick && !group.disabled && "cursor-pointer",
                                        group.highlight && "border-r border-dashed border-primary/60",
                                    );
                                    const tooltip = tooltipProps(group.key, group.onClick);
                                    return (
                                        <Tooltip key={group.key} {...tooltip.root}>
                                            <TooltipTrigger asChild {...tooltip.trigger}>
                                                {group.onClick ? (
                                                    <button
                                                        type="button"
                                                        disabled={group.disabled}
                                                        aria-label={group.ariaLabel}
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
            {clipped ? (
                <p className="text-[11px] text-muted-foreground">
                    Cột có vạch đứt cao hơn trục, xem số thật khi chạm hoặc rê vào cột.
                </p>
            ) : null}
        </div>
    );
}
