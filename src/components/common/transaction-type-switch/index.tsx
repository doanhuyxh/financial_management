"use client";

import { useRouter } from "next/navigation";
import Segmented from "@/components/common/segmented";
import { buildTransactionsUrl, type TransactionType } from "@/libs/utils/transactionsUrl";

const OPTIONS: { label: string; value: TransactionType }[] = [
    { label: "Chi tiêu", value: "expense" },
    { label: "Thu nhập", value: "income" },
    { label: "Chuyển tiền", value: "transfer" },
];

/**
 * Đặt ở tiêu đề form tạo giao dịch: đổi loại = mở form tạo của loại đó trên trang Giao dịch
 * (dữ liệu đang nhập ở form hiện tại bị bỏ).
 */
export default function TransactionTypeSwitch({ value }: { value: TransactionType }) {
    const router = useRouter();
    return (
        <Segmented<TransactionType>
            size="small"
            value={value}
            options={OPTIONS}
            aria-label="Loại giao dịch"
            onChange={(next) =>
                router.replace(buildTransactionsUrl(next, { action: "create", t: Date.now() }))
            }
        />
    );
}
