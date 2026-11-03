"use client";

import { Select } from "antd";
import type { Dayjs } from "dayjs";
import TransactionDateRange from "@/components/common/transaction-date-range";

type Option = { value: string; label: string };

type TransactionFilterFieldsProps = {
    categoryFilter?: string;
    sourceFilter?: string;
    onCategoryFilter?: (value: string) => void;
    onSourceFilter?: (value: string) => void;
    categoryOptions?: Option[];
    sourceOptions?: Option[];
    dateRange: [Dayjs | null, Dayjs | null] | null;
    onDateRange: (range: [Dayjs | null, Dayjs | null] | null) => void;
    layout: "desktop" | "drawer";
};

export default function TransactionFilterFields({
    categoryFilter,
    sourceFilter,
    onCategoryFilter,
    onSourceFilter,
    categoryOptions,
    sourceOptions,
    dateRange,
    onDateRange,
    layout,
}: TransactionFilterFieldsProps) {
    const selectClass = layout === "desktop" ? "w-full lg:w-fit lg:min-w-40" : "w-full";

    return (
        <>
            {categoryOptions && onCategoryFilter ? (
                <Select
                    value={categoryFilter}
                    onChange={onCategoryFilter}
                    options={categoryOptions}
                    className={selectClass}
                    popupMatchSelectWidth={false}
                    showSearch
                    optionFilterProp="label"
                />
            ) : null}
            {sourceOptions && onSourceFilter ? (
                <Select
                    value={sourceFilter}
                    onChange={onSourceFilter}
                    options={sourceOptions}
                    className={selectClass}
                    popupMatchSelectWidth={false}
                    showSearch
                    optionFilterProp="label"
                />
            ) : null}
            <TransactionDateRange value={dateRange} onChange={onDateRange} layout={layout} />
        </>
    );
}
