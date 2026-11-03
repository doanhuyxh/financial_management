"use client";

import { useSearchParams } from "next/navigation";
import { parseTransactionType } from "@/libs/utils/transactionsUrl";

/** Loại giao dịch đang xem, lấy từ `?type=` (mặc định chi tiêu). */
export function useTransactionType() {
    const searchParams = useSearchParams();
    return parseTransactionType(searchParams.get("type"));
}
