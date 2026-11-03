"use client";

import { useEffect, useState } from "react";
import MobileFilterShell from "@/components/common/mobile-filter-shell";
import ExpensesFilterDrawer from "@/components/features/expenses/components/header/filter-drawer";
import { useExpensesContext } from "@/components/features/expenses/context";
import { useDebounce } from "@/libs/hooks/useDebounce";
import TransactionSummaryStrip from "@/components/common/transaction-summary-strip";
import ActiveFilterChips, {
    dateRangeLabel,
    optionLabel,
} from "@/components/common/active-filter-chips";
import { useCategoryOptions } from "@/libs/hooks/customHooks/useCategories";
import { CategoryKind } from "@/libs/interfaces/categoriesData";
import { useSourceOptions } from "@/libs/hooks/customHooks/useSourcesOfMoney";

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
        summary,
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

    const { options: categoryOptions } = useCategoryOptions(CategoryKind.EXPENSE);
    const { options: sourceOptions } = useSourceOptions();
    const filterChips = [
        {
            key: "category",
            label: optionLabel(categoryOptions, categoryFilter),
            onRemove: () => handleCategoryFilter(""),
        },
        {
            key: "source",
            label: optionLabel(sourceOptions, sourceFilter),
            onRemove: () => handleSourceFilter(""),
        },
        { key: "date", label: dateRangeLabel(dateRange), onRemove: () => handleDateRange(null) },
    ];

    return (
        <MobileFilterShell
            searchValue={localSearch}
            onSearchChange={setLocalSearch}
            searchPlaceholder="Tìm theo ghi chú..."
            activeFilterCount={activeFilterCount}
            desktopFilters={fields("desktop")}
            drawerFilters={fields("drawer")}
            onClearFilters={clearFilters}
            activeFilters={<ActiveFilterChips chips={filterChips} onClearAll={clearFilters} />}
            createLabel="Thêm chi tiêu"
            onCreate={openCreateModal}
            mobileCreate={false}
            summary={
                <TransactionSummaryStrip
                    summary={summary}
                    unit="khoản chi"
                    kind="out"
                    dateRange={dateRange}
                />
            }
        />
    );
}
