"use client";

import { useEffect, useState } from "react";
import MobileFilterShell from "@/components/common/mobile-filter-shell";
import CategoryFilterDrawer from "@/components/features/categories/components/header/filter-drawer";
import { useCategoryContext } from "@/components/features/categories/context";
import { useDebounce } from "@/libs/hooks/useDebounce";

export default function CategoryHeader() {
    const { search, kindFilter, handleSearch, handleKindFilter, openCreateModal } =
        useCategoryContext();
    const [localSearch, setLocalSearch] = useState(search ?? "");
    const debouncedSearch = useDebounce(localSearch, 500);

    useEffect(() => {
        handleSearch(debouncedSearch);
    }, [debouncedSearch, handleSearch]);

    return (
        <MobileFilterShell
            searchValue={localSearch}
            onSearchChange={setLocalSearch}
            searchPlaceholder="Tìm kiếm danh mục..."
            activeFilterCount={kindFilter ? 1 : 0}
            desktopFilters={<CategoryFilterDrawer layout="desktop" />}
            drawerFilters={<CategoryFilterDrawer layout="drawer" />}
            onClearFilters={() => handleKindFilter("")}
            createLabel="Thêm danh mục"
            onCreate={openCreateModal}
        />
    );
}
