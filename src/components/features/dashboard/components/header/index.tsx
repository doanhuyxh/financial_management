"use client";

import { DatePicker, Spin } from "antd";
import { useDashboardContext } from "@/components/features/dashboard/context";

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
});

export default function DashboardHeader() {
    const { monthValue, summary, isLoading, handleChangeMonth } = useDashboardContext();

    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <p className="text-sm text-muted-foreground">
                    Thống kê chi tiêu theo tháng
                    {summary ? (
                        <>
                            {" · "}
                            Tổng:{" "}
                            <span className="font-medium text-foreground">
                                {currencyFormatter.format(summary.totalAmount)}
                            </span>
                        </>
                    ) : null}
                </p>
            </div>

            <div className="flex items-center gap-3">
                {isLoading ? <Spin size="small" /> : null}
                <DatePicker
                    picker="month"
                    value={monthValue}
                    onChange={handleChangeMonth}
                    format="MM/YYYY"
                    allowClear={false}
                />
            </div>
        </div>
    );
}
