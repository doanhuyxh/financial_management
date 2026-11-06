"use client";

import { Skeleton } from "@/components/shadcn/ui/skeleton";
import BestPick from "@/components/features/deposit-rate-compare/components/best-pick";
import ManualRateDialog from "@/components/features/deposit-rate-compare/components/manual-rate-dialog";
import RateMatrix from "@/components/features/deposit-rate-compare/components/rate-matrix";
import RateRanking from "@/components/features/deposit-rate-compare/components/rate-ranking";
import RateSources from "@/components/features/deposit-rate-compare/components/rate-sources";
import ScenarioForm from "@/components/features/deposit-rate-compare/components/scenario-form";
import { useDepositRateCompareContext } from "@/components/features/deposit-rate-compare/context";

/** Nội dung trang: kịch bản gửi → ngân hàng tốt nhất → xếp hạng → bảng đầy đủ → nguồn số liệu. */
export default function CompareContent() {
    const { isLoading, rows } = useDepositRateCompareContext();

    return (
        <div className="flex flex-col gap-4">
            <ScenarioForm />
            {isLoading ? (
                <div className="flex flex-col gap-3" role="status" aria-live="polite">
                    <span className="sr-only">Đang tải lãi suất…</span>
                    <Skeleton className="skeleton-shimmer h-24 animate-none rounded-xl" />
                    <Skeleton className="skeleton-shimmer h-64 animate-none rounded-xl" />
                </div>
            ) : (
                <>
                    {rows.length > 0 ? (
                        <>
                            <BestPick />
                            <RateRanking />
                            <RateMatrix />
                        </>
                    ) : (
                        <section className="rounded-xl border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">
                            Chưa có số liệu lãi suất. Bấm &quot;Lấy lại&quot; hoặc tự nhập lãi suất ở dưới.
                        </section>
                    )}
                    <RateSources />
                </>
            )}
            <ManualRateDialog />
        </div>
    );
}
