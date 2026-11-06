"use client";

import { useId, useMemo, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/shadcn/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/shadcn/ui/popover";
import { Spinner } from "@/components/shadcn/ui/spinner";
import { useFieldStatus } from "@/components/common/form-field";
import {
    flattenOptions,
    isOptionGroup,
    type SelectOptionOrGroup,
} from "@/libs/interfaces/selectOption";
import { cn } from "@/libs/shadcn/utils";

export interface IComboboxProps<V extends string = string> {
    value?: V | null;
    /** `undefined` khi bấm xóa (allowClear) */
    onChange?: (value: V | undefined) => void;
    options: SelectOptionOrGroup<V>[];
    placeholder?: string;
    /** Ô tìm trong danh sách; mặc định bật khi có ≥ 6 option */
    searchable?: boolean;
    searchPlaceholder?: string;
    emptyText?: string;
    loading?: boolean;
    disabled?: boolean;
    allowClear?: boolean;
    size?: "sm" | "default";
    className?: string;
    /** Danh sách rộng theo nội dung thay vì theo ô (VD: ô lọc hẹp trên toolbar) */
    popupMatchWidth?: boolean;
    id?: string;
    "aria-label"?: string;
}

/** Chọn một giá trị từ danh sách có tìm kiếm, hỗ trợ nhóm (thay antd Select `showSearch`). */
export default function Combobox<V extends string = string>({
    value,
    onChange,
    options,
    placeholder = "Chọn…",
    searchable,
    searchPlaceholder = "Tìm…",
    emptyText = "Không có kết quả",
    loading = false,
    disabled = false,
    allowClear = false,
    size = "default",
    className,
    popupMatchWidth = true,
    id,
    "aria-label": ariaLabel,
}: IComboboxProps<V>) {
    const [open, setOpen] = useState(false);
    const listId = useId();
    const status = useFieldStatus();
    const flat = useMemo(() => flattenOptions(options), [options]);
    const selected = value != null ? flat.find((option) => option.value === value) : undefined;
    const showSearch = searchable ?? flat.length >= 6;

    const select = (next: V) => {
        onChange?.(next);
        setOpen(false);
    };

    const renderItem = (option: (typeof flat)[number]) => (
        <CommandItem
            key={option.value}
            value={option.value}
            keywords={[option.label]}
            disabled={option.disabled}
            onSelect={() => select(option.value)}
        >
            <span className="truncate">{option.label}</span>
            {option.value === value ? <Check className="ml-auto size-4 shrink-0" /> : null}
        </CommandItem>
    );

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    id={id ?? status.id ?? undefined}
                    role="combobox"
                    aria-expanded={open}
                    aria-controls={listId}
                    aria-label={ariaLabel}
                    aria-invalid={status.invalid || undefined}
                    disabled={disabled}
                    className={cn(
                        "flex w-full min-w-0 cursor-pointer items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent pr-2 pl-2.5 text-left text-sm transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:border-destructive/50",
                        size === "sm" ? "h-7" : "h-8",
                        className,
                    )}
                >
                    <span className={cn("truncate", !selected && "text-muted-foreground")}>
                        {selected?.label ?? placeholder}
                    </span>
                    <span className="flex shrink-0 items-center gap-0.5 text-muted-foreground">
                        {allowClear && selected && !disabled ? (
                            <span
                                role="button"
                                aria-label="Xóa lựa chọn"
                                className="rounded-sm p-0.5 hover:bg-muted hover:text-foreground"
                                onPointerDown={(event) => {
                                    // Không mở popover khi bấm xóa
                                    event.preventDefault();
                                    event.stopPropagation();
                                }}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    onChange?.(undefined);
                                }}
                            >
                                <X className="size-3.5" />
                            </span>
                        ) : null}
                        {loading ? <Spinner className="size-4" /> : <ChevronDown className="size-4" />}
                    </span>
                </button>
            </PopoverTrigger>
            <PopoverContent
                align="start"
                className={cn("p-0", popupMatchWidth ? "w-(--radix-popover-trigger-width)" : "w-auto min-w-48")}
            >
                <Command>
                    {showSearch ? <CommandInput placeholder={searchPlaceholder} /> : null}
                    <CommandList id={listId} className="max-h-64">
                        <CommandEmpty>{loading ? "Đang tải…" : emptyText}</CommandEmpty>
                        {options.some(isOptionGroup)
                            ? options.map((option) =>
                                  isOptionGroup(option) ? (
                                      <CommandGroup key={option.title} heading={option.label}>
                                          {option.options.map(renderItem)}
                                      </CommandGroup>
                                  ) : (
                                      renderItem(option)
                                  ),
                              )
                            : flat.map(renderItem)}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
