"use client";

import { useEffect, useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import MobileFilterShell from "@/components/common/mobile-filter-shell";
import { Button } from "@/components/shadcn/ui/button";
import SourcesFilterDrawer from "@/components/features/sources-of-money/components/header/filter-drawer";
import { useSourcesOfMoneyContext } from "@/components/features/sources-of-money/context";
import { useDebounce } from "@/libs/hooks/useDebounce";

export default function SourcesOfMoneyHeader() {
    const {
        search,
        typeFilter,
        hideEmpty,
        handleSearch,
        handleTypeFilter,
        handleHideEmpty,
        openCreateModal,
        openTransferModal,
    } = useSourcesOfMoneyContext();

    const [localSearch, setLocalSearch] = useState(search ?? "");
    const debouncedSearch = useDebounce(localSearch, 500);

    useEffect(() => {
        handleSearch(debouncedSearch);
    }, [debouncedSearch, handleSearch]);

    return (
        <MobileFilterShell
            searchValue={localSearch}
            onSearchChange={setLocalSearch}
            searchPlaceholder="Tìm kiếm nguồn tiền..."
            activeFilterCount={(typeFilter ? 1 : 0) + (hideEmpty ? 1 : 0)}
            desktopFilters={<SourcesFilterDrawer layout="desktop" />}
            drawerFilters={<SourcesFilterDrawer layout="drawer" />}
            onClearFilters={() => {
                handleTypeFilter("");
                handleHideEmpty(false);
            }}
            createLabel="Thêm nguồn tiền"
            onCreate={openCreateModal}
            extraActions={
                <Button
                    type="button"
                    variant="outline"
                    aria-label="Chuyển tiền"
                    onClick={openTransferModal}
                >
                    <ArrowLeftRight className="size-4" />
                    <span className="hidden sm:inline">Chuyển tiền</span>
                </Button>
            }
        />
    );
}
