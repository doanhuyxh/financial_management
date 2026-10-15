"use client";

import { DatePicker, Select } from "antd";
import type { Dayjs } from "dayjs";
import DateRangeFields from "@/components/common/date-range-fields";

const { RangePicker } = DatePicker;

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
    const selectClass = layout === "desktop" ? "w-full lg:w-48" : "w-full";

    return (
        <>
            {categoryOptions && onCategoryFilter ? (
                <Select
                    value={categoryFilter}
                    onChange={onCategoryFilter}
                    options={categoryOptions}
                    className={selectClass}
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
                    showSearch
                    optionFilterProp="label"
                />
            ) : null}
            {layout === "desktop" ? (
                <RangePicker
                    inputReadOnly
                    value={dateRange}
                    onChange={(dates) =>
                        onDateRange(dates ? [dates[0] ?? null, dates[1] ?? null] : null)
                    }
                    className="w-full lg:w-auto"
                    format="DD/MM/YYYY"
                    allowClear
                />
            ) : (
                <DateRangeFields value={dateRange} onChange={onDateRange} />
            )}
        </>
    );
}
