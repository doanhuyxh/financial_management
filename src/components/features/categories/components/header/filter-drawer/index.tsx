"use client";

import { Select } from "antd";
import { useCategoryContext } from "@/components/features/categories/context";
import { CATEGORY_KIND_LABELS, CategoryKind } from "@/libs/interfaces/categoriesData";

const kindOptions = [
    { value: "", label: "Tất cả loại" },
    ...Object.values(CategoryKind).map((kind) => ({
        value: kind,
        label: CATEGORY_KIND_LABELS[kind],
    })),
];

export default function CategoryFilterDrawer({ layout }: { layout: "desktop" | "drawer" }) {
    const { kindFilter, handleKindFilter } = useCategoryContext();

    return (
        <Select
            value={kindFilter}
            onChange={handleKindFilter}
            options={kindOptions}
            className={layout === "desktop" ? "w-full sm:w-44" : "w-full"}
            placeholder="Loại"
        />
    );
}
