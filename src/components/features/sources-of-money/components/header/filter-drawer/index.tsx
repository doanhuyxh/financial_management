"use client";

import { Select, Switch } from "antd";
import { useSourcesOfMoneyContext } from "@/components/features/sources-of-money/context";
import {
    SOURCES_OF_MONEY_TYPE_LABELS,
    SourcesOfMoneyType,
} from "@/libs/interfaces/sourcesOfMoneyData";
import { cn } from "@/libs/shadcn/utils";

const typeOptions = [
    { value: "", label: "Tất cả loại" },
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
            <Select
                value={typeFilter}
                onChange={handleTypeFilter}
                options={typeOptions}
                className={layout === "desktop" ? "w-full sm:w-44" : "w-full"}
                placeholder="Loại"
            />
            <label
                className="flex cursor-pointer items-center gap-2 text-sm whitespace-nowrap"
                title="Ngân hàng, tiền mặt, ví: số dư = 0 · Thẻ tín dụng: dư nợ = 0"
            >
                <Switch size="small" checked={hideEmpty} onChange={handleHideEmpty} />
                Ẩn nguồn trống
                {hideEmpty && hiddenCount > 0 ? (
                    <span className="text-xs text-muted-foreground">({hiddenCount} đã ẩn)</span>
                ) : null}
            </label>
        </div>
    );
}
