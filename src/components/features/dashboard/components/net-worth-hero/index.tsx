"use client";

import Money from "@/components/common/money";
import { Progress } from "@/components/shadcn/ui/progress";
import { Skeleton } from "@/components/shadcn/ui/skeleton";
import { useDashboardContext } from "@/components/features/dashboard/context";
import AssetsBreakdown from "@/components/features/dashboard/components/net-worth-hero/components/assets-breakdown";
import { formatMoney } from "@/libs/utils/formatMoney";

/**
 * Số chính của dashboard là tài sản ròng (tiền mặt − dư nợ thẻ). Hạn mức tín dụng còn dùng được
 * chỉ là chỉ số phụ và không cộng vào tài sản. Số liệu hiện tại, không phụ thuộc tháng đang chọn.
 */
export default function NetWorthHero() {
    const { assets, totalCreditDebt, creditCards, isSourcesLoading } = useDashboardContext();

    const value = (node: React.ReactNode) =>
        isSourcesLoading ? <Skeleton className="skeleton-shimmer my-1 h-6 w-32 animate-none" /> : node;

    const creditRemainingPercent = assets.creditLimitTotal
        ? Math.round((assets.availableCreditTotal / assets.creditLimitTotal) * 100)
        : 0;
    const cardsWithDebt = creditCards.filter((card) => card.currentDebt > 0);
    const nearestDue = cardsWithDebt.find((card) => card.nextDueDate)?.nextDueDate;

    return (
        <section className="flex flex-col gap-3">
            <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-border bg-card lg:grid-cols-[1.3fr_1fr_1fr_1.2fr]">
                <div className="col-span-2 border-b border-border p-4 sm:p-5 lg:col-span-1 lg:border-r lg:border-b-0">
                    <p className="text-xs text-muted-foreground">Tài sản ròng</p>
                    {value(
                        <Money
                            value={assets.netWorth}
                            kind="auto"
                            signed={assets.netWorth < 0}
                            className="block text-2xl font-bold tracking-tight sm:text-3xl"
                        />,
                    )}
                    <p className="money-value mt-1 text-xs text-muted-foreground tabular-nums">
                        Tiền mặt {formatMoney(assets.cashTotal)} − Dư nợ thẻ{" "}
                        {formatMoney(totalCreditDebt)}
                    </p>
                </div>
                <div className="border-r border-border p-4 sm:p-5">
                    <p className="text-xs text-muted-foreground">Tiền mặt</p>
                    {value(
                        <Money
                            value={assets.cashTotal}
                            className="block text-lg font-semibold sm:text-xl"
                        />,
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                        {assets.cashSources.length} nguồn có số dư
                    </p>
                </div>
                <div className="p-4 sm:p-5 lg:border-r lg:border-border">
                    <p className="text-xs text-muted-foreground">Dư nợ thẻ</p>
                    {value(
                        <Money
                            value={totalCreditDebt}
                            kind="debt"
                            mutedZero
                            className="block text-lg font-semibold sm:text-xl"
                        />,
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                        {cardsWithDebt.length
                            ? `${cardsWithDebt.length} thẻ${nearestDue ? ` · hạn gần nhất ${nearestDue.format("DD/MM")}` : ""}`
                            : "Không có dư nợ"}
                    </p>
                </div>
                <div className="col-span-2 border-t border-border p-4 sm:p-5 lg:col-span-1 lg:border-t-0">
                    <p className="text-xs text-muted-foreground">Tín dụng còn dùng được</p>
                    {value(
                        <Money
                            value={assets.availableCreditTotal}
                            kind="credit"
                            className="block text-lg font-semibold sm:text-xl"
                        />,
                    )}
                    <Progress
                        value={creditRemainingPercent}
                        aria-label="Tín dụng còn dùng được"
                        className="my-1.5 h-1.5 *:data-[slot=progress-indicator]:bg-credit"
                    />
                    <p className="money-value text-xs text-muted-foreground">
                        {creditRemainingPercent}% của {formatMoney(assets.creditLimitTotal)} · không
                        tính vào tài sản
                    </p>
                </div>
            </div>
            <AssetsBreakdown />
        </section>
    );
}
