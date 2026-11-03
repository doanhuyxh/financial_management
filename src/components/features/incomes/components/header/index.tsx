"use client";

import { useEffect, useState } from "react";
import MobileFilterShell from "@/components/common/mobile-filter-shell";
import IncomesFilterDrawer from "@/components/features/incomes/components/header/filter-drawer";
import { useIncomesContext } from "@/components/features/incomes/context";
import { useDebounce } from "@/libs/hooks/useDebounce";
import TransactionSummaryStrip from "@/components/common/transaction-summary-strip";
import ActiveFilterChips, {
    dateRangeLabel,
    optionLabel,
} from "@/components/common/active-filter-chips";
import { useCategoryOptions } from "@/libs/hooks/customHooks/useCategories";
import { CategoryKind } from "@/libs/interfaces/categoriesData";
import { useSourceOptions } from "@/libs/hooks/customHooks/useSourcesOfMoney";

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
        summary,
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

    const { options: categoryOptions } = useCategoryOptions(CategoryKind.INCOME);
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
            desktopFilters={<IncomesFilterDrawer layout="desktop" />}
            drawerFilters={<IncomesFilterDrawer layout="drawer" />}
            onClearFilters={clearFilters}
            activeFilters={<ActiveFilterChips chips={filterChips} onClearAll={clearFilters} />}
            createLabel="Thêm thu nhập"
            onCreate={openCreateModal}
            mobileCreate={false}
            summary={
                <TransactionSummaryStrip
                    className="xl:hidden"
                    summary={summary}
                    unit="khoản thu"
                    kind="in"
                    dateRange={dateRange}
                />
            }
        />
    );
}
