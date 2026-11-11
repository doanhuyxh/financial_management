"use client";

import type { Dayjs } from "dayjs";
import BarList, { type IBarRow } from "@/components/common/bar-list";
import EmptyState from "@/components/common/empty-state";
import Money, { type MoneyKind } from "@/components/common/money";
import { Skeleton } from "@/components/shadcn/ui/skeleton";
import type { IListBreakdownItem, IListSummary } from "@/libs/interfaces/ApiResponseData";
import { getCategoryColor, OTHER_COLOR } from "@/libs/utils/categoryColor";
import { formatMoney } from "@/libs/utils/formatMoney";
import { cn } from "@/libs/shadcn/utils";

/** Số dòng skeleton của phần phân bổ khi đang tải */
const BREAKDOWN_SKELETON_ROWS = 4;

interface ITransactionInsightsProps {
    summary?: IListSummary;
    breakdown?: IListBreakdownItem[];
    loading?: boolean;
    /** VD: "khoản chi" */
    unit: string;
    kind: MoneyKind;
    /** VD: "Theo danh mục", "Theo nơi nhận" */
    breakdownTitle: string;
    dateRange?: [Dayjs | null, Dayjs | null] | null;
}

/**
 * Cột "Phân tích" bên phải danh sách giao dịch (màn hình ≥ xl): tổng của bộ lọc hiện tại và phân bổ
 * theo danh mục / nơi nhận. Mọi số tính trên toàn bộ kết quả lọc, không chỉ trang đang xem.
 */
export default function TransactionInsights({
    summary,
    breakdown,
    loading,
    unit,
    kind,
    breakdownTitle,
    dateRange,
}: ITransactionInsightsProps) {
    const [from, to] = dateRange ?? [];
    const days = from && to ? to.startOf("day").diff(from.startOf("day"), "day") + 1 : 0;
    const total = summary?.totalAmount ?? 0;
    const signedTotal = kind === "out" ? -total : total;

    const rows: IBarRow[] = (breakdown ?? []).map((item) => ({
        key: item.id,
        name: item.icon ? `${item.icon} ${item.name}` : item.name,
        total: item.total,
        color: getCategoryColor(item.id, item.color),
    }));
    const stats = [
        {
            label: "Trung bình / khoản",
            value: summary?.count ? formatMoney(total / summary.count) : "—",
        },
        ...(days ? [{ label: "Trung bình / ngày", value: formatMoney(total / days) }] : []),
        ...(summary?.totalFee !== undefined
            ? [{ label: "Tổng phí", value: formatMoney(summary.totalFee) }]
            : []),
    ];

    const shown = rows.reduce((sum, row) => sum + row.total, 0);
    if (total - shown > 0) {
        rows.push({ key: "__other__", name: "Khác", total: total - shown, color: OTHER_COLOR });
    }

    return (
        <aside className="hidden flex-col gap-3 xl:sticky xl:top-20 xl:flex">
            <section className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">
                    {summary ? `${summary.count.toLocaleString("vi-VN")} ${unit}` : " "}
                    {days ? ` · ${days} ngày` : ""}
                </p>
                {loading && !summary ? (
                    <Skeleton className="skeleton-shimmer mt-1 h-8 w-40 animate-none" />
                ) : (
                    <Money
                        value={signedTotal}
                        kind={kind}
                        signed={kind === "out" || kind === "in"}
                        className="block text-2xl font-bold tracking-tight"
                    />
                )}
                <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3 text-sm">
                    {stats.map((stat) => (
                        <div key={stat.label}>
                            <dt className="text-xs text-muted-foreground">{stat.label}</dt>
                            <dd className="money-value font-semibold tabular-nums">{stat.value}</dd>
                        </div>
                    ))}
                </dl>
            </section>

            <section className="rounded-xl border border-border bg-card p-4">
                <h3 className="mb-3 text-sm font-semibold">{breakdownTitle}</h3>
                {loading && !breakdown ? (
                    <div className="flex flex-col gap-3">
                        {Array.from({ length: BREAKDOWN_SKELETON_ROWS }, (_, index) => (
                            <Skeleton
                                key={index}
                                className={cn(
                                    "skeleton-shimmer h-4 animate-none",
                                    index === BREAKDOWN_SKELETON_ROWS - 1 ? "w-3/5" : "w-full",
                                )}
                            />
                        ))}
                    </div>
                ) : rows.length ? (
                    <BarList rows={rows} total={total} />
                ) : (
                    <EmptyState description="Chưa có dữ liệu" />
                )}
            </section>
        </aside>
    );
}
