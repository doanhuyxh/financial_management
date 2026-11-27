import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Xóa các query param "dùng một lần" (VD `?action=create&amount=`) sau khi trang đã đọc, để tải lại
 * trang không mở lại form hay áp lại bộ lọc. History API gốc đồng bộ với router Next, không gọi server.
 * Truyền `keys` là hằng ngoài component (tham chiếu ổn định).
 */
export function useConsumeSearchParams(keys: readonly string[]) {
    const searchParams = useSearchParams();

    useEffect(() => {
        if (!keys.some((key) => searchParams.has(key))) return;
        const params = new URLSearchParams(searchParams.toString());
        keys.forEach((key) => params.delete(key));
        const query = params.toString();
        window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
    }, [searchParams, keys]);
}
