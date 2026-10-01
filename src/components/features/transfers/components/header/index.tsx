"use client";

import { useEffect, useState } from "react";
import { Button, DatePicker, Input, Select } from "antd";
import { ArrowLeftRight, Search } from "lucide-react";
import { useTransfersContext } from "@/components/features/transfers/context";
import { useDebounce } from "@/libs/hooks/useDebounce";
import { useGetSourcesOfMoney } from "@/libs/hooks/customHooks/useSourcesOfMoney";

const { RangePicker } = DatePicker;

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

    const { data: sourcesData } = useGetSourcesOfMoney({ page: 1, limit: 100 });

    const sourceOptions = [
        { value: "", label: "Tất cả nguồn" },
        ...(sourcesData?.data?.items ?? []).map((item) => ({
            value: item._id,
            label: item.name,
        })),
    ];

    useEffect(() => {
        handleSearch(debouncedSearch);
        handleChangePage(1);
    }, [debouncedSearch, handleSearch, handleChangePage]);

    return (
        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center w-full flex-1">
            <Input
                allowClear
                prefix={<Search className="size-4 text-muted-foreground" />}
                placeholder="Tìm theo ghi chú..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="lg:max-w-xs"
            />
            <Select
                value={fromSourceFilter}
                onChange={handleFromSourceFilter}
                options={[{ value: "", label: "Từ nguồn: tất cả" }, ...sourceOptions.slice(1)]}
                className="w-full lg:w-48"
                showSearch
                optionFilterProp="label"
            />
            <Select
                value={toSourceFilter}
                onChange={handleToSourceFilter}
                options={[{ value: "", label: "Đến nguồn: tất cả" }, ...sourceOptions.slice(1)]}
                className="w-full lg:w-48"
                showSearch
                optionFilterProp="label"
            />
            <RangePicker
                value={dateRange}
                onChange={(dates) =>
                    handleDateRange(
                        dates ? [dates[0] ?? null, dates[1] ?? null] : null,
                    )
                }
                className="w-full lg:w-auto"
                format="DD/MM/YYYY"
                allowClear
            />
            <div className="flex-1 flex lg:justify-end">
                <Button
                    type="primary"
                    icon={<ArrowLeftRight className="size-4" />}
                    onClick={openCreateModal}
                >
                    Chuyển tiền
                </Button>
            </div>
        </div>
    );
}
