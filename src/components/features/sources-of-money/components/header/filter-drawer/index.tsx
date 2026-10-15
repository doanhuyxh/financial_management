"use client";

import { Select } from "antd";
import { useSourcesOfMoneyContext } from "@/components/features/sources-of-money/context";
import {
    SOURCES_OF_MONEY_TYPE_LABELS,
    SourcesOfMoneyType,
} from "@/libs/interfaces/sourcesOfMoneyData";

const typeOptions = [
    { value: "", label: "Tất cả loại" },
    ...Object.values(SourcesOfMoneyType).map((type) => ({
        value: type,
        label: SOURCES_OF_MONEY_TYPE_LABELS[type],
    })),
];

export default function SourcesFilterDrawer({ layout }: { layout: "desktop" | "drawer" }) {
    const { typeFilter, handleTypeFilter } = useSourcesOfMoneyContext();

    return (
        <Select
            value={typeFilter}
            onChange={handleTypeFilter}
            options={typeOptions}
            className={layout === "desktop" ? "w-full sm:w-44" : "w-full"}
            placeholder="Loại"
        />
    );
}
