"use client";

import { useEffect, useState } from "react";
/**
 * Hook giúp debounce giá trị (chỉ cập nhật sau một khoảng delay nhất định)
 * @param value - giá trị cần debounce
 * @param delay - thời gian chờ (ms)
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}