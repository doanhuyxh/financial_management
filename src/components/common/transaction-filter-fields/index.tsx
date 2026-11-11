"use client";

import type { Dayjs } from "dayjs";
import Combobox from "@/components/common/combobox";
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
    const desktop = layout === "desktop";
    const selectClass = desktop ? "w-full lg:w-fit lg:min-w-40" : "w-full";

    return (
        <>
            {categoryOptions && onCategoryFilter ? (
                <Combobox
                    value={categoryFilter}
                    // Bấm xóa (không có) → coi như "Tất cả"
                    onChange={(value) => onCategoryFilter(value ?? "")}
                    options={categoryOptions}
                    placeholder="Danh mục"
                    aria-label="Lọc theo danh mục"
                    className={selectClass}
                    // Toolbar desktop: ô hẹp, danh sách rộng theo nội dung
                    popupMatchWidth={!desktop}
                />
            ) : null}
            {sourceOptions && onSourceFilter ? (
                <Combobox
                    value={sourceFilter}
                    onChange={(value) => onSourceFilter(value ?? "")}
                    options={sourceOptions}
                    placeholder="Nguồn tiền"
                    aria-label="Lọc theo nguồn tiền"
                    className={selectClass}
                    popupMatchWidth={!desktop}
                />
            ) : null}
            <TransactionDateRange value={dateRange} onChange={onDateRange} layout={layout} />
        </>
    );
}
