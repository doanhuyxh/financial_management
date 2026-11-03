"use client";

import { Segmented } from "antd";
import { useRouter } from "next/navigation";
import { useTransactionType } from "@/components/features/transactions/hooks/useTransactionType";
import { buildTransactionsUrl, type TransactionType } from "@/libs/utils/transactionsUrl";

const OPTIONS: { label: string; value: TransactionType }[] = [
    { label: "Chi tiêu", value: "expense" },
    { label: "Thu nhập", value: "income" },
    { label: "Chuyển tiền", value: "transfer" },
];

/** Đổi loại giao dịch: thay `?type=` và bỏ các tham số khác (bộ lọc, action=create...). */
export default function TypeTabs() {
    const router = useRouter();
    const type = useTransactionType();

    return (
        <Segmented<TransactionType>
            value={type}
            options={OPTIONS}
            onChange={(value) => router.replace(buildTransactionsUrl(value))}
            className="w-full sm:w-fit [&_.ant-segmented-item]:flex-1"
        />
    );
}
