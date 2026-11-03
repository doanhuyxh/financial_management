"use client";

import type { ReactNode } from "react";
import { cn } from "@/libs/shadcn/utils";

export interface IChoiceChipOption {
    value: string;
    label: ReactNode;
    /** Chữ phụ màu nhạt sau nhãn (VD: số dư nguồn) */
    hint?: ReactNode;
}

interface IChoiceChipsProps {
    options: IChoiceChipOption[];
    value?: string | null;
    onChange: (value: string) => void;
    /** Nhãn nhỏ đứng trước, VD: "Thường dùng:" */
    label?: string;
    className?: string;
}

/** Hàng chip chọn nhanh một giá trị (danh mục, nguồn tiền, ngày...). Không có option thì không render. */
export default function ChoiceChips({ options, value, onChange, label, className }: IChoiceChipsProps) {
    if (options.length === 0) return null;
    return (
        <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
            {label ? <span className="mr-0.5 text-xs text-muted-foreground">{label}</span> : null}
            {options.map((option) => {
                const selected = option.value === value;
                return (
                    <button
                        key={option.value}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => onChange(option.value)}
                        className={cn(
                            "inline-flex max-w-full cursor-pointer items-center gap-1 rounded-full border px-2.5 py-0.5 text-[13px] leading-5 transition-colors",
                            selected
                                ? "border-primary bg-primary-soft font-medium text-accent-text"
                                : "border-border bg-card text-foreground hover:border-primary/60",
                        )}
                    >
                        <span className="truncate">{option.label}</span>
                        {option.hint ? (
                            <span className="money-value shrink-0 text-xs font-normal text-muted-foreground">
                                {option.hint}
                            </span>
                        ) : null}
                    </button>
                );
            })}
        </div>
    );
}
