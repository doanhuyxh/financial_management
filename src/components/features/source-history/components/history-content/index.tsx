"use client";

import { ArrowLeft } from "lucide-react";
import EmptyState from "@/components/common/empty-state";
import RouteLoading from "@/components/common/route-loading";
import { Button } from "@/components/shadcn/ui/button";
import CategoryBreakdown from "@/components/features/source-history/components/category-breakdown";
import HistoryHeader from "@/components/features/source-history/components/history-header";
import HistoryList from "@/components/features/source-history/components/history-list";
import HistorySummary from "@/components/features/source-history/components/history-summary";
import HistoryToolbar from "@/components/features/source-history/components/history-toolbar";
import SourceDailyChart from "@/components/features/source-history/components/source-daily-chart";
import { useSourceHistoryContext } from "@/components/features/source-history/context";

/** Bố cục trang: tiêu đề → biểu đồ theo ngày (riêng một hàng) → số liệu → bộ lọc → danh sách + phân bổ. */
export default function HistoryContent() {
    const { source, isSourceLoading, isCreditCard, range, handleBack } = useSourceHistoryContext();

    if (isSourceLoading) return <RouteLoading variant="list" />;

    if (!source) {
        return (
            <div className="rounded-xl border border-border bg-card py-10">
                <EmptyState description="Không tìm thấy nguồn tiền này. Có thể nguồn đã bị xóa.">
                    <Button type="button" variant="outline" onClick={handleBack}>
                        <ArrowLeft data-icon="inline-start" />
                        Về trang Nguồn tiền
                    </Button>
                </EmptyState>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <HistoryHeader />
            <SourceDailyChart
                // Đổi nguồn hoặc khoảng ngày lọc thì biểu đồ nhảy về tháng của ngày bắt đầu
                key={`${source._id}-${range.from ?? ""}`}
                sourceId={source._id}
                isCreditCard={isCreditCard}
                initialDay={range.from}
            />
            <HistorySummary />
            <HistoryToolbar />
            <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                <HistoryList />
                <CategoryBreakdown />
            </div>
        </div>
    );
}
