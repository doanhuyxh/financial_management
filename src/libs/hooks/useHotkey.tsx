"use client";

import { useEffect, useRef } from "react";

/** Đang gõ trong ô nhập hoặc đang mở modal/drawer thì không bắt phím tắt một chữ. */
function shouldIgnore(event: KeyboardEvent) {
    const target = event.target as HTMLElement | null;
    if (target?.isContentEditable) return true;
    if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return true;
    // Dialog / AlertDialog / Drawer (vaul) / Sheet / menu đang mở đều là Radix content có `data-state="open"`
    return Boolean(document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"], [role="menu"][data-state="open"]'));
}

/**
 * Phím tắt một chữ (không kèm Ctrl/⌘/Alt), VD: `useHotkey("n", openQuickAdd)`.
 * Bỏ qua khi đang gõ trong ô nhập hoặc khi có modal/drawer đang mở.
 */
export function useHotkey(key: string, handler: () => void, enabled = true) {
    const handlerRef = useRef(handler);
    useEffect(() => {
        handlerRef.current = handler;
    }, [handler]);

    useEffect(() => {
        if (!enabled) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.defaultPrevented || event.repeat) return;
            if (event.ctrlKey || event.metaKey || event.altKey) return;
            if (event.key.toLowerCase() !== key.toLowerCase()) return;
            if (shouldIgnore(event)) return;
            event.preventDefault();
            handlerRef.current();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [key, enabled]);
}

/** Ctrl/⌘ + Enter để lưu form khi modal đang mở (`enabled`). */
export function useSubmitShortcut(onSubmit: () => void, enabled: boolean) {
    const submitRef = useRef(onSubmit);
    useEffect(() => {
        submitRef.current = onSubmit;
    }, [onSubmit]);

    useEffect(() => {
        if (!enabled) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== "Enter" || !(event.ctrlKey || event.metaKey)) return;
            event.preventDefault();
            // Ô số tiền dùng debounce: blur để đẩy giá trị vừa gõ vào form trước khi lưu
            (document.activeElement as HTMLElement | null)?.blur?.();
            setTimeout(() => submitRef.current(), 0);
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [enabled]);
}
