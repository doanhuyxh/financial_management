"use client";

import { useEffect } from "react";
import useLocalStorage from "@/libs/hooks/useLocalStorage";
import { configLocalStorageKey } from "@/libs/constants/configKey";

/** Thuộc tính trên <html>; CSS trong globals.css làm mờ mọi `.money-value` khi bật. */
const PRIVACY_ATTRIBUTE = "data-privacy";

/**
 * Chế độ ẩn số dư: lưu theo trình duyệt (localStorage), đồng bộ giữa các component.
 * Gọi `usePrivacyMode({ apply: true })` ở đúng một chỗ (layout) để gắn thuộc tính lên <html>.
 */
export function usePrivacyMode({ apply = false }: { apply?: boolean } = {}) {
    const [enabled, setEnabled] = useLocalStorage<boolean>(configLocalStorageKey.PRIVACY_MODE, false);

    useEffect(() => {
        if (!apply) return;
        const root = document.documentElement;
        if (enabled) root.setAttribute(PRIVACY_ATTRIBUTE, "on");
        else root.removeAttribute(PRIVACY_ATTRIBUTE);
        return () => root.removeAttribute(PRIVACY_ATTRIBUTE);
    }, [apply, enabled]);

    return { enabled, toggle: () => setEnabled(!enabled) };
}
