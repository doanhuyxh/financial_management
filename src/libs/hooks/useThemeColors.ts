"use client";

import { useSyncExternalStore } from "react";

/**
 * Màu theme đọc thẳng từ CSS variable trong src/app/globals.css (nguồn duy nhất), cho nơi
 * không dùng được class/`var()` như biểu đồ @ant-design/plots. Tự cập nhật khi đổi sáng/tối.
 */
const TOKENS = {
    bg: "--background",
    card: "--card",
    card2: "--secondary",
    border: "--border",
    fg: "--foreground",
    muted: "--muted-foreground",
    primary: "--primary",
    accentText: "--accent-text",
    moneyIn: "--money-in",
    moneyOut: "--money-out",
    debt: "--debt",
    warn: "--warn",
    credit: "--credit",
} as const;

export type ThemeColors = Record<keyof typeof TOKENS, string>;

/** Trên server (và lần render hydrate đầu) chưa đọc được CSS: biểu đồ chỉ vẽ phía client nên không dùng tới. */
const SERVER_COLORS = Object.fromEntries(Object.keys(TOKENS).map((key) => [key, ""])) as ThemeColors;

let cache: { key: string; colors: ThemeColors } | null = null;

function getSnapshot(): ThemeColors {
    const root = document.documentElement;
    const key = root.className;
    if (cache?.key === key) return cache.colors;
    const style = getComputedStyle(root);
    const colors = Object.fromEntries(
        Object.entries(TOKENS).map(([name, variable]) => [name, style.getPropertyValue(variable).trim()]),
    ) as ThemeColors;
    cache = { key, colors };
    return colors;
}

function getServerSnapshot() {
    return SERVER_COLORS;
}

function subscribe(onChange: () => void) {
    const observer = new MutationObserver(onChange);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
}

export function useThemeColors() {
    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
