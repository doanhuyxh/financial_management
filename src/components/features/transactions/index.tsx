"use client";

import { useSearchParams } from "next/navigation";
import ExpensesComponent from "@/components/features/expenses";
import IncomesComponent from "@/components/features/incomes";
import TransfersComponent from "@/components/features/transfers";
import TypeTabs from "@/components/features/transactions/components/type-tabs";
import { useTransactionType } from "@/components/features/transactions/hooks/useTransactionType";

/**
 * Trang Giao dịch: một trang cho chi tiêu / thu nhập / chuyển tiền, chọn bằng `?type=`.
 * Mỗi loại vẫn là feature riêng (Provider, form, bộ lọc giữ nguyên).
 */
export default function TransactionsComponent() {
    const type = useTransactionType();
    // `?t=` (nút "+" / ghi giao dịch nhanh) đổi key để mount lại feature: context đọc `action=create` khi khởi tạo
    const nonce = useSearchParams().get("t") ?? "";

    return (
        <div className="flex flex-col gap-4">
            <TypeTabs />
            {type === "expense" ? <ExpensesComponent key={`expense-${nonce}`} /> : null}
            {type === "income" ? <IncomesComponent key={`income-${nonce}`} /> : null}
            {type === "transfer" ? <TransfersComponent key={`transfer-${nonce}`} /> : null}
        </div>
    );
}
