"use client";

import { Empty, Spin } from "antd";
import { Column } from "@ant-design/plots";
import { useDashboardContext } from "@/components/features/dashboard/context";

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
});

export default function DailyBarChart() {
    const { summary, isLoading, monthValue } = useDashboardContext();
    const data = summary?.byDay ?? [];
    const hasData = data.some((item) => item.total > 0);

    const config = {
        data,
        xField: "label",
        yField: "total",
        axis: {
            x: {
                title: "Ngày",
            },
            y: {
                title: false,
                labelFormatter: (value: number) =>
                    new Intl.NumberFormat("vi-VN", {
                        notation: "compact",
                        compactDisplay: "short",
                    }).format(value),
            },
        },
        style: {
            radiusTopLeft: 4,
            radiusTopRight: 4,
        },
        tooltip: {
            title: (item: { label: string }) => `Ngày ${item.label}`,
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
                <h2 className="text-base font-semibold">Chi tiêu theo ngày</h2>
                <p className="text-xs text-muted-foreground">
                    Tháng {monthValue.format("MM/YYYY")}
                </p>
            </div>

            {isLoading ? (
                <div className="flex h-72 items-center justify-center">
                    <Spin />
                </div>
            ) : !hasData ? (
                <div className="flex h-72 items-center justify-center">
                    <Empty description="Chưa có chi tiêu trong tháng này" />
                </div>
            ) : (
                <div className="h-80">
                    <Column {...config} height={320} autoFit />
                </div>
            )}
        </div>
    );
}
