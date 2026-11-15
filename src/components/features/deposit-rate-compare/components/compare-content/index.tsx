"use client";

import { Skeleton } from "@/components/shadcn/ui/skeleton";
import BestPick from "@/components/features/deposit-rate-compare/components/best-pick";
import ManualRateDialog from "@/components/features/deposit-rate-compare/components/manual-rate-dialog";
import RateBars from "@/components/features/deposit-rate-compare/components/rate-bars";
import RateChart from "@/components/features/deposit-rate-compare/components/rate-chart";
import RateMatrix from "@/components/features/deposit-rate-compare/components/rate-matrix";
import RateSources from "@/components/features/deposit-rate-compare/components/rate-sources";
import ScenarioForm from "@/components/features/deposit-rate-compare/components/scenario-form";
import { useDepositRateCompareContext } from "@/components/features/deposit-rate-compare/context";

/**
 * Nội dung trang: số tiền + kỳ hạn và câu trả lời (top 3) → tiền lãi dạng thanh → lãi suất theo kỳ hạn
 * (đường) → bảng chi tiết → nguồn số liệu thu gọn.
 */
export default function CompareContent() {
    const { isLoading, rows } = useDepositRateCompareContext();

    return (
        <div className="flex flex-col gap-4">
            <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
                <ScenarioForm />
                {isLoading ? (
                    <div className="flex flex-col gap-3" role="status" aria-live="polite">
                        <span className="sr-only">Đang tải lãi suất…</span>
                        <Skeleton className="skeleton-shimmer h-12 animate-none rounded-lg" />
                        <Skeleton className="skeleton-shimmer h-36 animate-none rounded-xl" />
                    </div>
                ) : rows.length > 0 ? (
                    <BestPick />
                ) : (
                    <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
                        Chưa có số liệu lãi suất. Bấm &quot;Lấy lại&quot; hoặc &quot;Tự nhập&quot; ở cuối trang.
                    </p>
                )}
            </section>
            {isLoading ? (
                <Skeleton className="skeleton-shimmer h-64 animate-none rounded-xl" />
            ) : rows.length > 0 ? (
                <>
                    <RateBars />
                    <RateChart />
                    <RateMatrix />
                </>
            ) : null}
            {isLoading ? null : <RateSources />}
            <ManualRateDialog />
        </div>
    );
}
