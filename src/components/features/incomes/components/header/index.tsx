"use client";

import { useEffect, useState } from "react";
import MobileFilterShell from "@/components/common/mobile-filter-shell";
import IncomesFilterDrawer from "@/components/features/incomes/components/header/filter-drawer";
import { useIncomesContext } from "@/components/features/incomes/context";
import { useDebounce } from "@/libs/hooks/useDebounce";

export default function IncomesHeader() {
    const {
        search,
        categoryFilter,
        sourceFilter,
        dateRange,
        handleSearch,
        handleCategoryFilter,
        handleSourceFilter,
        handleDateRange,
        handleChangePage,
        openCreateModal,
    } = useIncomesContext();

    const [localSearch, setLocalSearch] = useState(search ?? "");
    const debouncedSearch = useDebounce(localSearch, 500);

    useEffect(() => {
        handleSearch(debouncedSearch);
        handleChangePage(1);
    }, [debouncedSearch, handleSearch, handleChangePage]);

    const activeFilterCount = [categoryFilter, sourceFilter, dateRange?.[0] || dateRange?.[1]].filter(Boolean).length;

    const clearFilters = () => {
        handleCategoryFilter("");
        handleSourceFilter("");
        handleDateRange(null);
        handleChangePage(1);
    };

    return (
        <MobileFilterShell
            searchValue={localSearch}
            onSearchChange={setLocalSearch}
            searchPlaceholder="Tìm theo ghi chú..."
            activeFilterCount={activeFilterCount}
            desktopFilters={<IncomesFilterDrawer layout="desktop" />}
            drawerFilters={<IncomesFilterDrawer layout="drawer" />}
            onClearFilters={clearFilters}
            createLabel="Thêm thu nhập"
            onCreate={openCreateModal}
        />
    );
}
