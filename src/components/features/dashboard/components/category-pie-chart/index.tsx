"use client";

import { Empty, Spin } from "antd";
import { Pie } from "@ant-design/plots";
import { useDashboardContext } from "@/components/features/dashboard/context";

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
});

export default function CategoryPieChart() {
    const { summary, isLoading, monthValue } = useDashboardContext();
    const data = summary?.byCategory ?? [];

    const config = {
        data,
        angleField: "total",
        colorField: "categoryName",
        radius: 0.9,
        innerRadius: 0.55,
        legend: {
            color: {
                title: false,
                position: "bottom" as const,
                rowPadding: 4,
            },
        },
        label: {
            text: (item: { categoryName: string; total: number }) =>
                `${item.categoryName}\n${currencyFormatter.format(item.total)}`,
            position: "outside" as const,
            style: {
                fontSize: 11,
            },
        },
        tooltip: {
            title: "categoryName",
            items: [
                {
                    field: "total",
                    name: "Chi tiêu",
                    valueFormatter: (value: number) => currencyFormatter.format(value),
                },
            ],
        },
        interaction: {
            elementHighlight: true,
        },
    };

    return (
        <div className="rounded-xl border border-border bg-background p-4">
            <div className="mb-3">
                <h2 className="text-base font-semibold">
                    Chi tiêu theo danh mục
                </h2>
                <p className="text-xs text-muted-foreground">
                    Tháng {monthValue.format("MM/YYYY")}
                </p>
            </div>

            {isLoading ? (
                <div className="flex h-72 items-center justify-center">
                    <Spin />
                </div>
            ) : data.length === 0 ? (
                <div className="flex h-72 items-center justify-center">
                    <Empty description="Chưa có chi tiêu trong tháng này" />
                </div>
            ) : (
                <div className="h-80">
                    <Pie {...config} height={320} autoFit />
                </div>
            )}
        </div>
    );
}
