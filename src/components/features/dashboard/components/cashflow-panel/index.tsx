"use client";

import { useMemo, useState } from "react";
import BarList, { type IBarRow } from "@/components/common/bar-list";
import EmptyState from "@/components/common/empty-state";
import ParagraphSkeleton from "@/components/common/paragraph-skeleton";
import Segmented from "@/components/common/segmented";
import DailyChart from "@/components/features/dashboard/components/cashflow-panel/components/daily-chart";
import TrendChart from "@/components/features/dashboard/components/cashflow-panel/components/trend-chart";
import { useDashboardContext } from "@/components/features/dashboard/context";
import { getCategoryColor, OTHER_COLOR } from "@/libs/utils/categoryColor";
import { formatMoney } from "@/libs/utils/formatMoney";

type PanelTab = "day" | "category" | "source" | "month";

const TAB_OPTIONS: { label: string; value: PanelTab }[] = [
    { label: "Ngày", value: "day" },
    { label: "Danh mục", value: "category" },
    { label: "Nguồn", value: "source" },
    { label: "Tháng", value: "month" },
];

/** Số dòng tối đa của tab Danh mục / Nguồn; phần còn lại gộp vào "Khác". */
const MAX_ROWS = 6;

function toRows(
    items: { id: string | null; name: string; total: number; color?: string | null }[],
): IBarRow[] {
    const sorted = [...items].sort((a, b) => b.total - a.total);
    const rows = sorted.map((item) => ({
        key: item.id ?? item.name,
        name: item.name,
        total: item.total,
        color: getCategoryColor(item.id, item.color),
    }));
    if (rows.length <= MAX_ROWS) return rows;
    const rest = rows.slice(MAX_ROWS - 1);
    return [
        ...rows.slice(0, MAX_ROWS - 1),
        {
            key: "__other__",
            name: `Khác (${rest.length})`,
            total: rest.reduce((sum, row) => sum + row.total, 0),
            color: OTHER_COLOR,
        },
    ];
}

function Legend() {
    return (
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-money-in" />
                Thu
            </span>
            <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-money-out" />
                Chi
            </span>
        </div>
    );
}

/**
 * Khối biểu đồ chính của dashboard, rộng hết hàng, đổi bằng tab:
 * Ngày (thu chi mọi ngày trong tháng, mặc định) · Danh mục · Nguồn · Tháng (xu hướng tối đa 6 tháng).
 */
export default function CashflowPanel() {
    const { summary, isLoading, cashflow, isCashflowLoading, monthValue } = useDashboardContext();
    const [tab, setTab] = useState<PanelTab>("day");

    const categoryRows = useMemo(
        () =>
            toRows(
                (summary?.byCategory ?? []).map((item) => ({
                    id: item.categoryId || null,
                    name: item.icon ? `${item.icon} ${item.categoryName}` : item.categoryName,
                    total: item.total,
                    color: item.color,
                })),
            ),
        [summary],
    );
    const sourceRows = useMemo(
        () =>
            toRows(
                (summary?.bySource ?? []).map((item) => ({
                    id: item.sourceType ? item.sourceId : null,
                    name: item.sourceName,
                    total: item.total,
                })),
            ),
        [summary],
    );

    const monthLabel = monthValue.format("MM/YYYY");
    const total = summary?.totalAmount ?? 0;
    const spendingSubtitle = (count: number, unit: string) => (
        <span className="money-value tabular-nums">
            {formatMoney(total)} · {count} {unit}
        </span>
    );

    const header: Record<PanelTab, { title: string; subtitle: React.ReactNode }> = {
        day: {
            title: `Thu chi theo ngày · ${monthLabel}`,
            subtitle: "Mọi ngày trong tháng · bấm một ngày để xem chi tiêu ngày đó",
        },
        category: {
            title: `Chi tiêu tháng ${monthLabel} theo danh mục`,
            subtitle: spendingSubtitle(summary?.byCategory.length ?? 0, "danh mục"),
        },
        source: {
            title: `Chi tiêu tháng ${monthLabel} theo nguồn`,
            subtitle: spendingSubtitle(summary?.bySource.length ?? 0, "nguồn"),
        },
        month: {
            title: "Xu hướng thu – chi",
            subtitle: "Tối đa 6 tháng gần nhất · gồm phí chuyển tiền · * tháng đang chạy",
        },
    };

    let content: React.ReactNode;
    if (tab === "month") {
        content = <TrendChart />;
    } else if (tab === "day") {
        content =
            (isLoading && !summary) || (isCashflowLoading && !cashflow) ? (
                <ParagraphSkeleton rows={6} />
            ) : (
                <DailyChart />
            );
    } else if (isLoading && !summary) {
        content = <ParagraphSkeleton rows={4} />;
    } else if (!total) {
        content = <EmptyState description="Chưa có chi tiêu trong tháng này" />;
    } else {
        content = (
            <div className="max-w-3xl">
                <BarList rows={tab === "category" ? categoryRows : sourceRows} total={total} />
            </div>
        );
    }

    return (
        <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <h2 className="text-base font-semibold">{header[tab].title}</h2>
                    <p className="text-xs text-muted-foreground">{header[tab].subtitle}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    {tab === "day" ? <Legend /> : null}
                    <Segmented<PanelTab>
                        variant="primary"
                        aria-label="Chọn biểu đồ"
                        value={tab}
                        onChange={setTab}
                        options={TAB_OPTIONS}
                    />
                </div>
            </div>
            <div className="min-h-72">{content}</div>
        </section>
    );
}
