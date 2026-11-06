"use client";

import { X } from "lucide-react";
import { useFieldStatus } from "@/components/common/form-field";
import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupInput,
} from "@/components/shadcn/ui/input-group";
import { cn } from "@/libs/shadcn/utils";

/** Emoji gợi ý cho danh mục chi tiêu / thu nhập hay gặp */
const PRESET_ICONS = [
    "🍜", "🍲", "☕", "🧋", "🍱", "🥛", "🛒", "🏠", "💡", "💧",
    "🛋️", "🧴", "👕", "💊", "🏥", "🛵", "🚗", "⛽", "🚌", "✈️",
    "🎮", "🎬", "🎁", "📚", "🎓", "💻", "📱", "🌐", "🤖", "🖥️",
    "🐶", "👶", "💇", "🏋️", "💳", "🧾", "💰", "💼", "📈", "🤝",
];

interface IIconPickerProps {
    /** Nhận value/onChange từ Controller của react-hook-form */
    value?: string | null;
    onChange?: (value: string | null) => void;
}

/** Chọn 1 emoji từ danh sách gợi ý hoặc tự nhập; bấm lại emoji đang chọn để bỏ. */
export default function IconPicker({ value, onChange }: IIconPickerProps) {
    const status = useFieldStatus();
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
            <InputGroup className="max-w-56">
                <InputGroupInput
                    id={status.id || undefined}
                    maxLength={16}
                    value={value ?? ""}
                    onChange={(event) => onChange?.(event.target.value.trim() || null)}
                    placeholder="Hoặc dán emoji khác"
                />
                {value ? (
                    <InputGroupAddon align="inline-end">
                        <InputGroupButton
                            size="icon-xs"
                            aria-label="Xóa icon"
                            onClick={() => onChange?.(null)}
                        >
                            <X />
                        </InputGroupButton>
                    </InputGroupAddon>
                ) : null}
            </InputGroup>
        </div>
    );
}
