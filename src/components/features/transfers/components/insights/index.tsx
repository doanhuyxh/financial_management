"use client";

import TransactionInsights from "@/components/common/transaction-insights";
import { useTransfersContext } from "@/components/features/transfers/context";

/** Cột "Phân tích" bên phải danh sách (chỉ hiện ở màn hình ≥ xl). */
export default function TransfersInsights() {
    const { summary, breakdown, isLoading, dateRange } = useTransfersContext();
    return (
        <TransactionInsights
            summary={summary}
            breakdown={breakdown}
            loading={isLoading}
            unit="giao dịch"
            kind="neutral"
            breakdownTitle="Theo nơi nhận"
            dateRange={dateRange}
        />
    );
}
