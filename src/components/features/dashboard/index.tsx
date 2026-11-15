"use client";

import DashboardContextProvider from "@/components/features/dashboard/context";
import AttentionStrip from "@/components/features/dashboard/components/attention-strip";
import NetWorthHero from "@/components/features/dashboard/components/net-worth-hero";
import MonthSummary from "@/components/features/dashboard/components/month-summary";
import CashflowPanel from "@/components/features/dashboard/components/cashflow-panel";
import CreditCardsPanel from "@/components/features/dashboard/components/credit-cards-panel";
import CardRolloverModal from "@/components/features/dashboard/components/card-rollover-modal";

/** Bố cục: Cần chú ý (chip) → Tháng này → Khối biểu đồ (tab Ngày / Danh mục / Nguồn / Tháng) → Tài sản ròng → Thẻ tín dụng. */
export default function DashboardComponent() {
    return (
        <DashboardContextProvider>
            <div className="flex flex-col gap-4">
                <AttentionStrip />
                <MonthSummary />
                <CashflowPanel />
                <NetWorthHero />
                <CreditCardsPanel />
            </div>
            <CardRolloverModal />
        </DashboardContextProvider>
    );
}
