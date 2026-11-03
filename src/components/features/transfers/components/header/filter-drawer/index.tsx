"use client";

import { Select } from "antd";
import type { Dayjs } from "dayjs";
import TransactionDateRange from "@/components/common/transaction-date-range";
import { useTransfersContext } from "@/components/features/transfers/context";
import { useSourceOptions } from "@/libs/hooks/customHooks/useSourcesOfMoney";

export default function TransfersFilterDrawer({ layout }: { layout: "desktop" | "drawer" }) {
    const {
        fromSourceFilter,
        toSourceFilter,
        dateRange,
        handleFromSourceFilter,
        handleToSourceFilter,
        handleDateRange,
    } = useTransfersContext();
    const { options } = useSourceOptions();
    const fromOptions = [{ value: "", label: "Từ nguồn: tất cả" }, ...options];
    const toOptions = [{ value: "", label: "Đến nguồn: tất cả" }, ...options];
    const selectClass = layout === "desktop" ? "w-full lg:w-fit lg:min-w-40" : "w-full";

    return (
        <>
            <Select
                value={fromSourceFilter}
                onChange={handleFromSourceFilter}
                options={fromOptions}
                className={selectClass}
                popupMatchSelectWidth={false}
                showSearch
                optionFilterProp="label"
            />
            <Select
                value={toSourceFilter}
                onChange={handleToSourceFilter}
                options={toOptions}
                className={selectClass}
                popupMatchSelectWidth={false}
                showSearch
                optionFilterProp="label"
            />
            <TransactionDateRange
                value={dateRange}
                onChange={handleDateRange as (range: [Dayjs | null, Dayjs | null] | null) => void}
                layout={layout}
            />
        </>
    );
}
