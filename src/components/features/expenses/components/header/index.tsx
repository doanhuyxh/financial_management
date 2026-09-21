"use client";

import { useEffect, useState } from "react";
import { Button, DatePicker, Input, Select } from "antd";
import { Plus, Search } from "lucide-react";
import { useExpensesContext } from "@/components/features/expenses/context";
import { useDebounce } from "@/libs/hooks/useDebounce";
import { useGetCategories } from "@/libs/hooks/customHooks/useCategories";
import { useGetSourcesOfMoney } from "@/libs/hooks/customHooks/useSourcesOfMoney";

const { RangePicker } = DatePicker;

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

    const { data: categoriesData } = useGetCategories({ page: 1, limit: 100 });
    const { data: sourcesData } = useGetSourcesOfMoney({ page: 1, limit: 100 });

    const categoryOptions = [
        { value: "", label: "Tất cả danh mục" },
        ...(categoriesData?.data?.items ?? []).map((item) => ({
            value: item._id,
            label: item.name,
        })),
    ];

    const sourceOptions = [
        { value: "", label: "Tất cả nguồn tiền" },
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
        <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-xl font-semibold tracking-tight">Chi tiêu</h1>
                <Button
                    type="primary"
                    icon={<Plus className="size-4" />}
                    onClick={openCreateModal}
                >
                    Thêm chi tiêu
                </Button>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
                <Input
                    allowClear
                    prefix={<Search className="size-4 text-muted-foreground" />}
                    placeholder="Tìm theo ghi chú..."
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                    className="lg:max-w-xs"
                />
                <Select
                    value={categoryFilter}
                    onChange={handleCategoryFilter}
                    options={categoryOptions}
                    className="w-full lg:w-48"
                    showSearch
                    optionFilterProp="label"
                />
                <Select
                    value={sourceFilter}
                    onChange={handleSourceFilter}
                    options={sourceOptions}
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
            </div>
        </div>
    );
}
