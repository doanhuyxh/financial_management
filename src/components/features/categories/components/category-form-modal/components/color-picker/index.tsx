"use client";

import { Check } from "lucide-react";
import { CATEGORY_PALETTE } from "@/libs/utils/categoryColor";
import { cn } from "@/libs/shadcn/utils";

interface IColorPickerProps {
    /** Nhận value/onChange từ Controller của react-hook-form; null = màu tự động theo id */
    value?: string | null;
    onChange?: (value: string | null) => void;
}

/** Bảng 10 màu cố định (đọc được trên nền sáng và tối) + "Tự động". */
export default function ColorPicker({ value, onChange }: IColorPickerProps) {
    return (
        <div className="flex flex-wrap items-center gap-2">
            <button
                type="button"
                aria-pressed={!value}
                onClick={() => onChange?.(null)}
                className={cn(
                    "h-8 cursor-pointer rounded-full border px-3 text-xs transition-colors",
                    !value ? "border-primary bg-primary-soft text-accent-text" : "border-border",
                )}
            >
                Tự động
            </button>
            {CATEGORY_PALETTE.map((color) => (
                <button
                    key={color}
                    type="button"
                    aria-label={`Màu ${color}`}
                    aria-pressed={value === color}
                    onClick={() => onChange?.(color)}
                    className="flex size-8 cursor-pointer items-center justify-center rounded-full ring-offset-2 ring-offset-card transition-shadow aria-pressed:ring-2 aria-pressed:ring-foreground"
                    style={{ backgroundColor: color }}
                >
                    {value === color ? <Check className="size-4 text-white" /> : null}
                </button>
            ))}
        </div>
    );
}
