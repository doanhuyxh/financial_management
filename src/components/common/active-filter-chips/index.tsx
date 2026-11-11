"use client";

import type { Dayjs } from "dayjs";
import { X } from "lucide-react";
import Tag from "@/components/common/tag";
import { matchDateRangePreset } from "@/libs/utils/dateRangePresets";

export interface IActiveFilterChip {
    key: string;
    label: string;
    onRemove: () => void;
}

/** Nhãn của option đang chọn trong danh sách `{ value, label }` (rỗng nếu không tìm thấy). */
export function optionLabel(options: { value: string; label: string }[], value?: string | null) {
    if (!value) return "";
    return options.find((option) => option.value === value)?.label ?? "";
}

/** "01/11 – 03/11" (thêm năm khi khác năm hiện tại); một đầu thì "Từ 01/11" / "Đến 03/11". */
export function dateRangeLabel(range?: [Dayjs | null, Dayjs | null] | null) {
    const [from, to] = range ?? [];
    if (!from && !to) return "";
    const preset = matchDateRangePreset(range);
    if (preset) return preset.label;
    const year = new Date().getFullYear();
    const format = (date: Dayjs) => date.format(date.year() === year ? "DD/MM" : "DD/MM/YYYY");
    if (from && to) return from.isSame(to, "day") ? format(from) : `${format(from)} – ${format(to)}`;
    return from ? `Từ ${format(from)}` : `Đến ${format(to as Dayjs)}`;
}

/** Hàng chip bộ lọc đang bật, bấm × để bỏ từng bộ lọc. Không có bộ lọc nào thì không render. */
export default function ActiveFilterChips({
    chips,
    onClearAll,
}: {
    chips: IActiveFilterChip[];
    onClearAll?: () => void;
}) {
    const visible = chips.filter((chip) => chip.label);
    if (visible.length === 0) return null;
    return (
        <div className="flex flex-wrap items-center gap-1.5">
            {visible.map((chip) => (
                <Tag
                    key={chip.key}
                    className="h-auto rounded-full border-border bg-card px-2.5 py-0.5 text-[13px] leading-5 font-normal text-foreground"
                >
                    {chip.label}
                    <button
                        type="button"
                        aria-label={`Bỏ lọc ${chip.label}`}
                        onClick={chip.onRemove}
                        className="-mr-0.5 flex cursor-pointer items-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <X className="size-3" />
                    </button>
                </Tag>
            ))}
            {visible.length > 1 && onClearAll ? (
                <button
                    type="button"
                    onClick={onClearAll}
                    className="cursor-pointer px-1 text-xs font-medium text-accent-text hover:underline"
                >
                    Xóa tất cả
                </button>
            ) : null}
        </div>
    );
}
