"use client";

import Combobox from "@/components/common/combobox";
import { Switch } from "@/components/shadcn/ui/switch";
import { useSourcesOfMoneyContext } from "@/components/features/sources-of-money/context";
import type { SelectOption } from "@/libs/interfaces/selectOption";
import {
    SOURCES_OF_MONEY_TYPE_LABELS,
    SourcesOfMoneyType,
} from "@/libs/interfaces/sourcesOfMoneyData";
import { cn } from "@/libs/shadcn/utils";

/** Ô chọn cần giá trị khác rỗng, nên "Tất cả loại" (bộ lọc "") dùng khóa riêng. */
const ALL_TYPES = "ALL";
type TypeOption = SourcesOfMoneyType | typeof ALL_TYPES;

const typeOptions: SelectOption<TypeOption>[] = [
    { value: ALL_TYPES, label: "Tất cả loại" },
    ...Object.values(SourcesOfMoneyType).map((type) => ({
        value: type,
        label: SOURCES_OF_MONEY_TYPE_LABELS[type],
    })),
];

export default function SourcesFilterDrawer({ layout }: { layout: "desktop" | "drawer" }) {
    const { typeFilter, hideEmpty, hiddenCount, handleTypeFilter, handleHideEmpty } =
        useSourcesOfMoneyContext();

    return (
        <div
            className={cn(
                "flex gap-3",
                layout === "desktop" ? "flex-row items-center" : "flex-col",
            )}
        >
            <Combobox<TypeOption>
                value={typeFilter || ALL_TYPES}
                onChange={(value) => handleTypeFilter(!value || value === ALL_TYPES ? "" : value)}
                options={typeOptions}
                searchable={false}
                className={layout === "desktop" ? "w-full sm:w-44" : "w-full"}
                placeholder="Loại"
                aria-label="Loại nguồn tiền"
            />
            <label
                className="flex cursor-pointer items-center gap-2 text-sm whitespace-nowrap"
                title="Ẩn ngân hàng, tiền mặt, ví có số dư = 0 (thẻ tín dụng luôn hiện)"
            >
                <Switch size="sm" checked={hideEmpty} onCheckedChange={handleHideEmpty} />
                Ẩn nguồn trống
                {hideEmpty && hiddenCount > 0 ? (
                    <span className="text-xs text-muted-foreground">({hiddenCount} đã ẩn)</span>
                ) : null}
            </label>
        </div>
    );
}
