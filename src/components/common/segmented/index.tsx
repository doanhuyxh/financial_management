"use client";

import type { ReactNode } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/shadcn/ui/toggle-group";
import { cn } from "@/libs/shadcn/utils";

export interface ISegmentedOption<V extends string> {
    value: V;
    label: ReactNode;
    disabled?: boolean;
}

interface ISegmentedProps<V extends string> {
    options: ISegmentedOption<V>[];
    value: V;
    onChange: (value: V) => void;
    /** Giãn đủ chiều rộng, các mục chia đều */
    block?: boolean;
    size?: "small" | "default";
    className?: string;
    "aria-label"?: string;
}

/** Nhóm nút chọn một giá trị (thay antd Segmented): nền `muted`, mục đang chọn nổi lên nền `card`. */
export default function Segmented<V extends string>({
    options,
    value,
    onChange,
    block = false,
    size = "default",
    className,
    "aria-label": ariaLabel,
}: ISegmentedProps<V>) {
    return (
        <ToggleGroup
            type="single"
            value={value}
            onValueChange={(next) => {
                // Radix cho bỏ chọn (trả ""); Segmented luôn phải có một mục đang chọn
                if (next) onChange(next as V);
            }}
            spacing={0}
            aria-label={ariaLabel}
            className={cn(
                "rounded-lg bg-muted p-0.5",
                block ? "flex w-full" : "inline-flex w-fit",
                className,
            )}
        >
            {options.map((option) => (
                <ToggleGroupItem
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                    aria-label={typeof option.label === "string" ? option.label : undefined}
                    className={cn(
                        "rounded-md! text-muted-foreground hover:bg-transparent hover:text-foreground data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-sm",
                        size === "small" ? "h-6 px-2 text-xs" : "h-7 px-3 text-sm",
                        block && "flex-1",
                    )}
                >
                    {option.label}
                </ToggleGroupItem>
            ))}
        </ToggleGroup>
    );
}
