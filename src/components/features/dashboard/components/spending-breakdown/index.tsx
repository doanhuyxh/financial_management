"use client";

import { useMemo, useState } from "react";
import { Empty, Segmented, Skeleton, Tooltip } from "antd";
import { useDashboardContext } from "@/components/features/dashboard/context";
import { getCategoryColor, OTHER_COLOR } from "@/libs/utils/categoryColor";
import BarList, { type IBarRow } from "@/components/common/bar-list";
import { formatMoney } from "@/libs/utils/formatMoney";

type BreakdownTab = "category" | "source" | "day";

/** Số dòng tối đa; phần còn lại gộp vào "Khác". */
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

/** Cột chi tiêu theo ngày: chỉ các ngày đã qua; bấm cột để xem danh sách chi tiêu ngày đó. */
function DayColumns() {
    const { summary, cashflow, monthValue, handleViewDay } = useDashboardContext();
    const days = (summary?.byDay ?? []).slice(0, cashflow?.period.daysElapsed ?? 0);
    const max = Math.max(1, ...days.map((day) => day.total));

    if (days.length === 0) return <Empty description="Tháng này chưa bắt đầu" />;

    return (
        <div className="flex h-44 items-end gap-0.5 border-b border-border sm:gap-1">
            {days.map((day) => (
                <Tooltip
                    key={day.day}
                    title={`${day.label}/${monthValue.format("MM")}: ${formatMoney(day.total)}`}
                >
                    <button
                        type="button"
                        aria-label={`Ngày ${day.label}: ${formatMoney(day.total)}`}
                        onClick={() => handleViewDay(day.day)}
                        className="group flex h-full min-w-0 flex-1 cursor-pointer flex-col items-center justify-end gap-1"
                    >
                        <span
                            className="w-full max-w-7 rounded-t bg-money-out/80 transition-colors group-hover:bg-money-out"
                            style={{ height: `${day.total ? Math.max(3, (day.total / max) * 100) : 0}%` }}
                        />
                        <span className="text-[10px] leading-none text-muted-foreground tabular-nums">
                            {days.length <= 10 || day.day % 5 === 1 ? day.label : " "}
                        </span>
                    </button>
                </Tooltip>
            ))}
        </div>
    );
}

export default function SpendingBreakdown() {
    const { summary, isLoading, monthValue } = useDashboardContext();
    const [tab, setTab] = useState<BreakdownTab>("category");

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

    const total = summary?.totalAmount ?? 0;
    const count = summary?.byCategory.length ?? 0;

    let content: React.ReactNode;
    if (isLoading && !summary) {
        content = <Skeleton active paragraph={{ rows: 4 }} />;
    } else if (!total) {
        content = <Empty description="Chưa có chi tiêu trong tháng này" />;
    } else if (tab === "category") {
        content = <BarList rows={categoryRows} total={total} />;
    } else if (tab === "source") {
        content = <BarList rows={sourceRows} total={total} />;
    } else {
        content = <DayColumns />;
    }

    return (
        <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="text-base font-semibold">
                        Chi tiêu tháng {monthValue.format("MM/YYYY")}
                    </h2>
                    <p className="money-value text-xs text-muted-foreground tabular-nums">
                        {formatMoney(total)} · {count} danh mục
                    </p>
                </div>
                <Segmented<BreakdownTab>
                    size="small"
                    value={tab}
                    onChange={setTab}
                    options={[
                        { label: "Danh mục", value: "category" },
                        { label: "Nguồn", value: "source" },
                        { label: "Ngày", value: "day" },
                    ]}
                />
            </div>
            {content}
        </section>
    );
}
