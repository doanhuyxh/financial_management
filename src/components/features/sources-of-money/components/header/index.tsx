"use client";

import { useEffect, useState } from "react";
import { Button, Input, Select } from "antd";
import { Plus, Search } from "lucide-react";
import { useSourcesOfMoneyContext } from "@/components/features/sources-of-money/context";
import { useDebounce } from "@/libs/hooks/useDebounce";
import {
    SOURCES_OF_MONEY_TYPE_LABELS,
    SourcesOfMoneyType,
} from "@/libs/interfaces/sourcesOfMoneyData";

const typeOptions = [
    { value: "", label: "Tất cả loại" },
    ...Object.values(SourcesOfMoneyType).map((type) => ({
        value: type,
        label: SOURCES_OF_MONEY_TYPE_LABELS[type],
    })),
];

export default function SourcesOfMoneyHeader() {
    const {
        search,
        typeFilter,
        handleSearch,
        handleTypeFilter,
        handleChangePage,
        openCreateModal,
    } = useSourcesOfMoneyContext();

    const [localSearch, setLocalSearch] = useState(search ?? "");
    const debouncedSearch = useDebounce(localSearch, 500);

    useEffect(() => {
        handleSearch(debouncedSearch);
        handleChangePage(1);
    }, [debouncedSearch, handleSearch, handleChangePage]);

    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                <Input
                    allowClear
                    prefix={<Search className="size-4 text-muted-foreground" />}
                    placeholder="Tìm kiếm nguồn tiền..."
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                    className="sm:max-w-xs"
                />
                <Select
                    value={typeFilter}
                    onChange={handleTypeFilter}
                    options={typeOptions}
                    className="w-full sm:w-44"
                    placeholder="Loại"
                />
            </div>
            <Button type="primary" icon={<Plus className="size-4" />} onClick={openCreateModal}>
                Thêm nguồn tiền
            </Button>
        </div>
    );
}
