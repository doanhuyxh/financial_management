"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Input } from "@/components/shadcn/ui/input";
import { useFieldStatus } from "@/components/common/form-field";
import { useDebounce } from "@/libs/hooks/useDebounce";
import { cn } from "@/libs/shadcn/utils";

interface DebouncedNumberInputProps {
    value?: string | number | null;
    onChange?: (value: string | number | null) => void;
    min?: number;
    delay?: number;
    /** Số chữ số thập phân tối đa (0 = chỉ số nguyên). Mặc định 2. */
    precision?: number;
    placeholder?: string;
    disabled?: boolean;
    size?: "default" | "large";
    /** Chữ/ký hiệu ở cuối ô (VD: "₫", "%") */
    suffix?: ReactNode;
    className?: string;
    id?: string;
    onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
    "aria-label"?: string;
}

/** Class cho ô số tiền cỡ lớn ở đầu form giao dịch (dùng kèm size="large"). */
export const LARGE_AMOUNT_INPUT_CLASS = "h-12! text-2xl! font-bold! tabular-nums";

const normalizeValue = (v: string | number | null | undefined) =>
    v === undefined || v === null || v === "" ? "" : String(v);

/** "1234567.5" → "1.234.567,5" (vi-VN); giữ dấu phẩy cuối khi đang gõ phần lẻ. */
function formatDisplay(raw: string) {
    if (!raw) return "";
    const hasTrailingDecimal = raw.endsWith(".");
    const [intPart, decPart] = raw.split(".");
    const formattedInt = intPart ? new Intl.NumberFormat("vi-VN").format(Number(intPart)) : "";
    if (decPart !== undefined && decPart !== "") return `${formattedInt},${decPart}`;
    if (hasTrailingDecimal) return `${formattedInt},`;
    return formattedInt;
}

/** "1.234.567,5" → "1234567.5" (chỉ giữ chữ số và tối đa `precision` số lẻ). */
function parseInput(text: string, precision: number) {
    if (!text) return "";
    const normalized = text.replace(/\./g, "").replace(",", ".");
    const [intPart, ...decParts] = normalized.split(".");
    const digits = (intPart || "").replace(/\D/g, "");
    if (precision > 0 && normalized.includes(".")) {
        const decimals = decParts.join("").replace(/\D/g, "").slice(0, precision);
        return decimals.length > 0 ? `${digits}.${decimals}` : `${digits}.`;
    }
    return digits;
}

/**
 * Ô nhập số có nhóm nghìn kiểu vi-VN. Gõ chỉ cập nhật state cục bộ; form nhận giá trị sau `delay`
 * (hoặc khi blur) để không re-render cả form theo từng phím.
 */
export default function DebouncedNumberInput({
    value,
    onChange,
    min = 0,
    delay = 500,
    precision = 2,
    placeholder,
    disabled,
    size = "default",
    suffix,
    className,
    id,
    onBlur,
    "aria-label": ariaLabel,
}: DebouncedNumberInputProps) {
    const status = useFieldStatus();
    const [localValue, setLocalValue] = useState(String(value ?? ""));
    const debouncedValue = useDebounce(localValue, delay);
    // Last value this input pushed to the form; its echo back through `value`
    // must not overwrite keystrokes typed after the debounce fired.
    const lastEmittedRef = useRef<string | null>(null);

    const emit = (next: string) => {
        lastEmittedRef.current = next;
        onChange?.(next);
    };

    useEffect(() => {
        if (value === undefined || value === null) return;
        if (String(value) === lastEmittedRef.current) return;
        setLocalValue(String(value));
    }, [value]);

    useEffect(() => {
        if (!onChange) return;
        // Treat undefined/null/"" as the same empty value so mount (value still
        // undefined) does not call onChange("") and trigger validation early.
        if (normalizeValue(debouncedValue) === normalizeValue(value)) return;
        emit(debouncedValue || "");
    }, [debouncedValue]);

    const flushToForm = () => {
        if (!onChange) return;
        const next = String(localValue) || "";
        if (next === normalizeValue(value)) return;
        emit(next);
    };

    const handleChange = (text: string) => {
        let next = parseInput(text, precision);
        if (next && min >= 0 && next.startsWith("-")) next = next.slice(1);
        setLocalValue(next);
    };

    return (
        <div className="relative w-full">
            <Input
                id={id ?? status.id ?? undefined}
                type="text"
                inputMode={precision > 0 ? "decimal" : "numeric"}
                autoComplete="off"
                aria-label={ariaLabel}
                aria-invalid={status.invalid || undefined}
                disabled={disabled}
                placeholder={placeholder}
                value={formatDisplay(localValue)}
                className={cn("tabular-nums", suffix ? "pr-8" : undefined, size === "large" && "h-12 text-2xl", className)}
                onChange={(event) => handleChange(event.target.value)}
                onKeyDown={(event) => {
                    const allowedKeys = ["Backspace", "Delete", "Tab", "ArrowLeft", "ArrowRight", "Home", "End", "Enter"];
                    if (allowedKeys.includes(event.key) || event.ctrlKey || event.metaKey) return;
                    if (event.key === "," || event.key === ".") {
                        const current = (event.target as HTMLInputElement).value || "";
                        if (precision === 0 || current.includes(",")) event.preventDefault();
                        return;
                    }
                    if (!/^\d$/.test(event.key)) event.preventDefault();
                }}
                onBlur={(event) => {
                    flushToForm();
                    onBlur?.(event);
                }}
            />
            {suffix ? (
                <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-sm text-muted-foreground">
                    {suffix}
                </span>
            ) : null}
        </div>
    );
}
