"use client";

import { useRef } from "react";

function createKey() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * Khóa `Idempotency-Key` cho mutation tạo giao dịch: giữ nguyên qua các lần gửi lại (bấm đúp,
 * thử lại sau lỗi mạng) để server không tạo trùng; gọi `rotate()` sau khi tạo thành công để
 * lần tạo kế tiếp là một yêu cầu mới.
 */
export function useIdempotencyKey() {
    const keyRef = useRef<string | null>(null);
    return {
        get: () => (keyRef.current ??= createKey()),
        rotate: () => {
            keyRef.current = null;
        },
    };
}
