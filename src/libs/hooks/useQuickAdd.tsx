"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppSelector } from "@/libs/redux/redux";
import { selectPathname } from "@/libs/redux/navigationSlice";
import { MENU_KEY } from "@/libs/constants/menuKey";
import { buildTransactionsUrl, parseTransactionType } from "@/libs/utils/transactionsUrl";

/**
 * Mở form ghi giao dịch: đang ở trang Giao dịch thì tạo đúng loại đang xem, nơi khác thì tạo chi tiêu.
 * `t` đổi mỗi lần gọi để trang Giao dịch mount lại và mở form, kể cả khi đang ở đúng trang đó.
 * Dùng `useSearchParams` nên component gọi hook phải nằm trong `<Suspense>`.
 */
export function useQuickAdd() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = useAppSelector(selectPathname);

    return useCallback(() => {
        const onTransactions =
            pathname === MENU_KEY.TRANSACTIONS || pathname.startsWith(`${MENU_KEY.TRANSACTIONS}/`);
        const type = onTransactions ? parseTransactionType(searchParams.get("type")) : "expense";
        router.push(buildTransactionsUrl(type, { action: "create", t: Date.now() }));
    }, [pathname, router, searchParams]);
}
