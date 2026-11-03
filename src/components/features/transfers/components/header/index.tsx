"use client";

import { useEffect, useState } from "react";
import MobileFilterShell from "@/components/common/mobile-filter-shell";
import TransfersFilterDrawer from "@/components/features/transfers/components/header/filter-drawer";
import { useTransfersContext } from "@/components/features/transfers/context";
import { useDebounce } from "@/libs/hooks/useDebounce";
import TransactionSummaryStrip from "@/components/common/transaction-summary-strip";
import ActiveFilterChips, {
    dateRangeLabel,
    optionLabel,
} from "@/components/common/active-filter-chips";
import { useSourceOptions } from "@/libs/hooks/customHooks/useSourcesOfMoney";

export default function TransfersHeader() {
    const {
        search,
        fromSourceFilter,
        toSourceFilter,
        dateRange,
        handleSearch,
        handleFromSourceFilter,
        handleToSourceFilter,
        handleDateRange,
        handleChangePage,
        openCreateModal,
        summary,
    } = useTransfersContext();

    const [localSearch, setLocalSearch] = useState(search ?? "");
    const debouncedSearch = useDebounce(localSearch, 500);

    useEffect(() => {
        handleSearch(debouncedSearch);
        handleChangePage(1);
    }, [debouncedSearch, handleSearch, handleChangePage]);

    const activeFilterCount = [fromSourceFilter, toSourceFilter, dateRange?.[0] || dateRange?.[1]].filter(Boolean).length;

    const clearFilters = () => {
        handleFromSourceFilter("");
        handleToSourceFilter("");
        handleDateRange(null);
        handleChangePage(1);
    };

    const { options: sourceOptions } = useSourceOptions();
    const filterChips = [
        {
            key: "from",
            label: fromSourceFilter ? `Từ: ${optionLabel(sourceOptions, fromSourceFilter)}` : "",
            onRemove: () => handleFromSourceFilter(""),
        },
        {
            key: "to",
            label: toSourceFilter ? `Đến: ${optionLabel(sourceOptions, toSourceFilter)}` : "",
            onRemove: () => handleToSourceFilter(""),
        },
        { key: "date", label: dateRangeLabel(dateRange), onRemove: () => handleDateRange(null) },
    ];

    return (
        <MobileFilterShell
            searchValue={localSearch}
            onSearchChange={setLocalSearch}
            searchPlaceholder="Tìm theo ghi chú..."
            activeFilterCount={activeFilterCount}
            desktopFilters={<TransfersFilterDrawer layout="desktop" />}
            drawerFilters={<TransfersFilterDrawer layout="drawer" />}
            onClearFilters={clearFilters}
            activeFilters={<ActiveFilterChips chips={filterChips} onClearAll={clearFilters} />}
            createLabel="Chuyển tiền"
            onCreate={openCreateModal}
            mobileCreate={false}
            summary={
                <TransactionSummaryStrip
                    className="xl:hidden"
                    summary={summary}
                    unit="giao dịch"
                    kind="neutral"
                    dateRange={dateRange}
                />
            }
        />
    );
}
