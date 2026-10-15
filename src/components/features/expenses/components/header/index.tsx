"use client";

import { useEffect, useState } from "react";
import MobileFilterShell from "@/components/common/mobile-filter-shell";
import ExpensesFilterDrawer from "@/components/features/expenses/components/header/filter-drawer";
import { useExpensesContext } from "@/components/features/expenses/context";
import { useDebounce } from "@/libs/hooks/useDebounce";

export default function ExpensesHeader() {
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
    } = useExpensesContext();

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

    const fields = (layout: "desktop" | "drawer") => <ExpensesFilterDrawer layout={layout} />;

    return (
        <MobileFilterShell
            searchValue={localSearch}
            onSearchChange={setLocalSearch}
            searchPlaceholder="Tìm theo ghi chú..."
            activeFilterCount={activeFilterCount}
            desktopFilters={fields("desktop")}
            drawerFilters={fields("drawer")}
            onClearFilters={clearFilters}
            createLabel="Thêm chi tiêu"
            onCreate={openCreateModal}
        />
    );
}
