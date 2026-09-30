"use client";

import { useEffect, useState } from "react";

function readIsDark() {
    if (typeof document === "undefined") return false;
    return document.documentElement.classList.contains("dark");
}

/** Syncs with the `dark` class on `<html>` (same source as AntdProvider). */
export function useIsDarkMode() {
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        const sync = () => {
            setIsDark((prev) => {
                const next = readIsDark();
                return prev === next ? prev : next;
            });
        };

        sync();
        const observer = new MutationObserver(() => {
            requestAnimationFrame(sync);
        });
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["class"],
        });

        return () => observer.disconnect();
    }, []);

    return isDark;
}
