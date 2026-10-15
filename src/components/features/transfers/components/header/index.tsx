"use client";

import { useEffect, useState } from "react";
import MobileFilterShell from "@/components/common/mobile-filter-shell";
import TransfersFilterDrawer from "@/components/features/transfers/components/header/filter-drawer";
import { useTransfersContext } from "@/components/features/transfers/context";
import { useDebounce } from "@/libs/hooks/useDebounce";

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

    return (
        <MobileFilterShell
            searchValue={localSearch}
            onSearchChange={setLocalSearch}
            searchPlaceholder="Tìm theo ghi chú..."
            activeFilterCount={activeFilterCount}
            desktopFilters={<TransfersFilterDrawer layout="desktop" />}
            drawerFilters={<TransfersFilterDrawer layout="drawer" />}
            onClearFilters={clearFilters}
            createLabel="Chuyển tiền"
            onCreate={openCreateModal}
        />
    );
}
