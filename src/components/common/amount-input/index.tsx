"use client";

import { useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Form } from "antd";
import DebouncedNumberInput, {
    LARGE_AMOUNT_INPUT_CLASS,
} from "@/components/common/input/DebouncedNumberInput";
import { ModalFooterSlotContext } from "@/components/common/responsive-modal";
import AmountKeypad, {
    type AmountKeypadKey,
} from "@/components/common/amount-input/components/amount-keypad";
import { useIsMobile } from "@/libs/hooks/use-mobile";
import { cn } from "@/libs/shadcn/utils";

/** Đặt lên phần tử bấm vào mà không muốn đóng bàn phím số (VD chip gợi ý số tiền). */
export const KEEP_AMOUNT_KEYPAD_ATTR = "data-keep-amount-keypad";

/** Tối đa 13 chữ số (đến hàng nghìn tỷ) */
const MAX_DIGITS = 13;

const amountFormatter = new Intl.NumberFormat("vi-VN");

type AmountInputProps = {
    value?: string | number | null;
    onChange?: (value: string | number | null) => void;
    /** Mobile: mở sẵn bàn phím số khi form mở (form tạo mới) */
    defaultKeypadOpen?: boolean;
};

const toDigits = (value: AmountInputProps["value"]) =>
    String(value ?? "")
        .split(".")[0]
        .replace(/\D/g, "")
        .replace(/^0+/, "");

function applyKey(digits: string, key: AmountKeypadKey) {
    if (key === "clear") return "";
    if (key === "back") return digits.slice(0, -1);
    // Chưa có số thì 0/000 ở đầu vô nghĩa
    if (!digits && (key === "0" || key === "000")) return "";
    return (digits + key).slice(0, MAX_DIGITS);
}

/**
 * Ô số tiền cỡ lớn ở đầu form giao dịch.
 * - Desktop: ô nhập số như cũ (DebouncedNumberInput).
 * - Mobile trong ResponsiveModal: ô hiển thị + bàn phím số riêng ghim ở footer Drawer,
 *   không bật bàn phím hệ thống nên không che form và luôn thấy số đang gõ.
 */
export default function AmountInput({ value, onChange, defaultKeypadOpen = false }: AmountInputProps) {
    const isMobile = useIsMobile();
    const footerSlot = useContext(ModalFooterSlotContext);
    const useKeypad = isMobile && footerSlot !== null;
    const { status } = Form.Item.useStatus();

    const [keypadOpen, setKeypadOpen] = useState(defaultKeypadOpen);
    const displayRef = useRef<HTMLButtonElement>(null);
    const digits = toDigits(value);

    // Form reset về rỗng (VD sau khi lưu với "Tạo tiếp") thì mở lại bàn phím để gõ khoản tiếp theo
    const prevDigitsRef = useRef(digits);
    useEffect(() => {
        if (prevDigitsRef.current && !digits) setKeypadOpen(true);
        prevDigitsRef.current = digits;
    }, [digits]);

    // Bấm ra ngoài ô số tiền / bàn phím (chọn danh mục, gõ ghi chú...) thì ẩn bàn phím số
    useEffect(() => {
        if (!useKeypad || !keypadOpen) return;
        const handlePointerDown = (event: PointerEvent) => {
            const target = event.target as Element | null;
            if (!target) return;
            if (displayRef.current?.contains(target)) return;
            if (target.closest(`[data-amount-keypad], [${KEEP_AMOUNT_KEYPAD_ATTR}]`)) return;
            setKeypadOpen(false);
        };
        document.addEventListener("pointerdown", handlePointerDown, true);
        return () => document.removeEventListener("pointerdown", handlePointerDown, true);
    }, [useKeypad, keypadOpen]);

    if (!useKeypad) {
        return (
            <DebouncedNumberInput
                value={value}
                onChange={onChange}
                min={0}
                // Tiền là số nguyên VND: server từ chối số lẻ
                precision={0}
                placeholder="0"
                delay={300}
                size="large"
                suffix="₫"
                className={LARGE_AMOUNT_INPUT_CLASS}
            />
        );
    }

    const handleKey = (key: AmountKeypadKey) => {
        const next = applyKey(digits, key);
        if (next !== digits) onChange?.(next);
    };

    const openKeypad = () => {
        setKeypadOpen(true);
        // Ô số tiền có thể đã bị cuộn khuất
        requestAnimationFrame(() => displayRef.current?.scrollIntoView({ block: "nearest" }));
    };

    return (
        <>
            <button
                ref={displayRef}
                type="button"
                onClick={openKeypad}
                aria-label="Số tiền"
                className={cn(
                    "flex h-14 w-full cursor-pointer items-center justify-end gap-1 rounded-lg border bg-card px-3 tabular-nums transition-colors",
                    keypadOpen ? "border-primary ring-2 ring-primary/20" : "border-border",
                    status === "error" && "border-destructive",
                )}
            >
                <span className={cn("text-2xl font-bold", !digits && "text-muted-foreground")}>
                    {digits ? amountFormatter.format(Number(digits)) : "0"}
                </span>
                {keypadOpen ? <span className="h-7 w-0.5 animate-pulse bg-primary" aria-hidden /> : null}
                <span className="ml-1 text-base text-muted-foreground">₫</span>
            </button>
            {keypadOpen
                ? createPortal(
                      <AmountKeypad onKey={handleKey} onHide={() => setKeypadOpen(false)} />,
                      footerSlot,
                  )
                : null}
        </>
    );
}
