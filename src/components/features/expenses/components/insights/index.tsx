"use client";

import TransactionInsights from "@/components/common/transaction-insights";
import { useExpensesContext } from "@/components/features/expenses/context";

/** Cột "Phân tích" bên phải danh sách (chỉ hiện ở màn hình ≥ xl). */
export default function ExpensesInsights() {
    const { summary, breakdown, isLoading, dateRange } = useExpensesContext();
    return (
        <TransactionInsights
            summary={summary}
            breakdown={breakdown}
            loading={isLoading}
            unit="khoản chi"
            kind="out"
            breakdownTitle="Theo danh mục"
            dateRange={dateRange}
        />
    );
}
