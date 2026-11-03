"use client";

import { useEffect, useState } from "react";
import { Segmented } from "antd";
import MobileFilterShell from "@/components/common/mobile-filter-shell";
import { useCategoryContext } from "@/components/features/categories/context";
import { CATEGORY_KIND_LABELS, CategoryKind } from "@/libs/interfaces/categoriesData";
import { useDebounce } from "@/libs/hooks/useDebounce";

export default function CategoryHeader() {
    const { search, kindFilter, kindCounts, handleSearch, handleKindFilter, openCreateModal } =
        useCategoryContext();
    const [localSearch, setLocalSearch] = useState(search ?? "");
    const debouncedSearch = useDebounce(localSearch, 500);

    useEffect(() => {
        handleSearch(debouncedSearch);
    }, [debouncedSearch, handleSearch]);

    return (
        <div className="flex flex-col gap-3">
            <Segmented<CategoryKind>
                value={kindFilter}
                onChange={handleKindFilter}
                options={Object.values(CategoryKind).map((kind) => ({
                    value: kind,
                    label: `${CATEGORY_KIND_LABELS[kind]} · ${kindCounts[kind]}`,
                }))}
                className="w-full sm:w-fit [&_.ant-segmented-item]:flex-1"
            />
            <MobileFilterShell
                searchValue={localSearch}
                onSearchChange={setLocalSearch}
                searchPlaceholder="Tìm kiếm danh mục..."
                createLabel="Thêm danh mục"
                onCreate={openCreateModal}
            />
        </div>
    );
}
