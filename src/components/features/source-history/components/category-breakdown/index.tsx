"use client";

import BarList, { type IBarRow } from "@/components/common/bar-list";
import EmptyState from "@/components/common/empty-state";
import { useSourceHistoryContext } from "@/components/features/source-history/context";

/** Số danh mục hiện riêng; phần còn lại gộp vào "Khác". */
const TOP_ROWS = 8;

/** Khoản chi theo danh mục trên toàn bộ kết quả lọc (không chỉ trang đang xem). */
export default function CategoryBreakdown() {
    const { breakdown, isLoading } = useSourceHistoryContext();

    const total = breakdown.reduce((sum, item) => sum + item.total, 0);
    const rows: IBarRow[] = breakdown.slice(0, TOP_ROWS).map((item) => ({
        key: item.id || "none",
        name: item.icon ? `${item.icon} ${item.name}` : item.name,
        total: item.total,
    }));
    const otherTotal = breakdown.slice(TOP_ROWS).reduce((sum, item) => sum + item.total, 0);
    if (otherTotal > 0) {
        rows.push({ key: "other", name: "Khác", total: otherTotal });
    }

    return (
        <section className="rounded-xl border border-border bg-card p-4 xl:sticky xl:top-4">
            <div className="mb-3 flex items-baseline justify-between gap-2">
                <h2 className="text-sm font-medium">Chi theo danh mục</h2>
                <span className="text-xs text-muted-foreground">theo bộ lọc</span>
            </div>
            {rows.length > 0 ? (
                <BarList rows={rows} total={total} />
            ) : isLoading ? null : (
                <EmptyState description="Không có khoản chi trong bộ lọc này" />
            )}
        </section>
    );
}
