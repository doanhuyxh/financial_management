"use client";

import DashboardContextProvider from "@/components/features/dashboard/context";
import AttentionStrip from "@/components/features/dashboard/components/attention-strip";
import NetWorthHero from "@/components/features/dashboard/components/net-worth-hero";
import MonthSummary from "@/components/features/dashboard/components/month-summary";
import CashflowTrend from "@/components/features/dashboard/components/cashflow-trend";
import SpendingBreakdown from "@/components/features/dashboard/components/spending-breakdown";
import CreditCardsPanel from "@/components/features/dashboard/components/credit-cards-panel";

/** Bố cục: Cần chú ý → Tài sản ròng → Tháng này → (Xu hướng | Chi tiêu tháng) → Thẻ tín dụng. */
export default function DashboardComponent() {
    return (
        <DashboardContextProvider>
            <div className="flex flex-col gap-4">
                <AttentionStrip />
                <NetWorthHero />
                <MonthSummary />
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_1fr]">
                    <CashflowTrend />
                    <SpendingBreakdown />
                </div>
                <CreditCardsPanel />
            </div>
        </DashboardContextProvider>
    );
}
