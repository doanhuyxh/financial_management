"use client";

import type { Dayjs } from "dayjs";
import Combobox from "@/components/common/combobox";
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
            <Combobox
                value={fromSourceFilter}
                onChange={(value) => handleFromSourceFilter(value ?? "")}
                options={fromOptions}
                className={selectClass}
                popupMatchWidth={false}
                searchable
                aria-label="Lọc theo nguồn chuyển"
            />
            <Combobox
                value={toSourceFilter}
                onChange={(value) => handleToSourceFilter(value ?? "")}
                options={toOptions}
                className={selectClass}
                popupMatchWidth={false}
                searchable
                aria-label="Lọc theo nguồn nhận"
            />
            <TransactionDateRange
                value={dateRange}
                onChange={handleDateRange as (range: [Dayjs | null, Dayjs | null] | null) => void}
                layout={layout}
            />
        </>
    );
}
