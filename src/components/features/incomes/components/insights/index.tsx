"use client";

import TransactionInsights from "@/components/common/transaction-insights";
import { useIncomesContext } from "@/components/features/incomes/context";

/** Cột "Phân tích" bên phải danh sách (chỉ hiện ở màn hình ≥ xl). */
export default function IncomesInsights() {
    const { summary, breakdown, isLoading, dateRange } = useIncomesContext();
    return (
        <TransactionInsights
            summary={summary}
            breakdown={breakdown}
            loading={isLoading}
            unit="khoản thu"
            kind="in"
            breakdownTitle="Theo danh mục"
            dateRange={dateRange}
        />
    );
}
