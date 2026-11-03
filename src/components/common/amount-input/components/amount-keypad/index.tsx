"use client";

import type { ReactNode } from "react";
import { ChevronDown, Delete } from "lucide-react";
import { cn } from "@/libs/shadcn/utils";

export type AmountKeypadKey = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "000" | "back" | "clear";

const DIGIT_ROWS: AmountKeypadKey[] = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "000", "0", "back"];

type AmountKeypadProps = {
    onKey: (key: AmountKeypadKey) => void;
    onHide: () => void;
};

/** Bàn phím số trong trang thay cho bàn phím hệ thống khi nhập số tiền trên mobile. */
export default function AmountKeypad({ onKey, onHide }: AmountKeypadProps) {
    const renderKey = (key: AmountKeypadKey) => {
        let content: ReactNode = key;
        if (key === "back") content = <Delete className="size-5" aria-label="Xóa 1 số" />;
        return (
            <button
                key={key}
                type="button"
                // Không lấy focus để không đóng/mở bàn phím hệ thống
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => onKey(key)}
                className={cn(
                    "flex h-11 cursor-pointer select-none items-center justify-center rounded-lg bg-muted text-xl font-semibold tabular-nums text-foreground transition-colors active:bg-primary-soft",
                    key === "back" && "text-muted-foreground",
                )}
            >
                {content}
            </button>
        );
    };

    return (
        <div data-amount-keypad className="mb-2 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
                <button
                    type="button"
                    onPointerDown={(event) => event.preventDefault()}
                    onClick={() => onKey("clear")}
                    className="cursor-pointer px-1 py-0.5 text-xs text-muted-foreground"
                >
                    Xóa hết
                </button>
                <button
                    type="button"
                    onPointerDown={(event) => event.preventDefault()}
                    onClick={onHide}
                    aria-label="Ẩn bàn phím số"
                    className="flex cursor-pointer items-center gap-0.5 px-1 py-0.5 text-xs text-muted-foreground"
                >
                    Ẩn <ChevronDown className="size-4" />
                </button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">{DIGIT_ROWS.map(renderKey)}</div>
        </div>
    );
}
