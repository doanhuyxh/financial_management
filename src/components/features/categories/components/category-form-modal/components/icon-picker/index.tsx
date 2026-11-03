"use client";

import { Input } from "antd";
import { cn } from "@/libs/shadcn/utils";

/** Emoji gợi ý cho danh mục chi tiêu / thu nhập hay gặp */
const PRESET_ICONS = [
    "🍜", "🍲", "☕", "🧋", "🍱", "🥛", "🛒", "🏠", "💡", "💧",
    "🛋️", "🧴", "👕", "💊", "🏥", "🛵", "🚗", "⛽", "🚌", "✈️",
    "🎮", "🎬", "🎁", "📚", "🎓", "💻", "📱", "🌐", "🤖", "🖥️",
    "🐶", "👶", "💇", "🏋️", "💳", "🧾", "💰", "💼", "📈", "🤝",
];

interface IIconPickerProps {
    /** antd Form.Item tự truyền value/onChange */
    value?: string | null;
    onChange?: (value: string | null) => void;
}

/** Chọn 1 emoji từ danh sách gợi ý hoặc tự nhập; bấm lại emoji đang chọn để bỏ. */
export default function IconPicker({ value, onChange }: IIconPickerProps) {
    return (
        <div className="flex flex-col gap-2">
            <div className="grid grid-cols-10 gap-1">
                {PRESET_ICONS.map((icon) => (
                    <button
                        key={icon}
                        type="button"
                        aria-pressed={value === icon}
                        onClick={() => onChange?.(value === icon ? null : icon)}
                        className={cn(
                            "flex aspect-square cursor-pointer items-center justify-center rounded-md border text-lg transition-colors",
                            value === icon
                                ? "border-primary bg-primary-soft"
                                : "border-transparent hover:bg-muted",
                        )}
                    >
                        {icon}
                    </button>
                ))}
            </div>
            <Input
                allowClear
                maxLength={16}
                value={value ?? ""}
                onChange={(event) => onChange?.(event.target.value.trim() || null)}
                placeholder="Hoặc dán emoji khác"
                className="max-w-56"
            />
        </div>
    );
}
