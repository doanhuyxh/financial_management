"use client";

import { useMemo } from "react";
import { Collapse, Empty, Spin, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useDashboardContext } from "@/components/features/dashboard/context";
import type { AssetGroup, IAssetSourceItem } from "@/components/features/dashboard/utils";
import { SOURCES_OF_MONEY_TYPE_LABELS } from "@/libs/interfaces/sourcesOfMoneyData";
import { useIsMobile } from "@/libs/hooks/use-mobile";
import { formatMoney } from "@/libs/utils/formatMoney";

const GROUP_LABELS: Record<AssetGroup, string> = {
    cash: "Tiền mặt",
    credit: "Tín dụng có thể dùng",
};

const GROUP_COLORS: Record<AssetGroup, string> = {
    cash: "text-green-500",
    credit: "text-blue-500",
};

type BreakdownRow =
    | { kind: "group"; key: string; group: AssetGroup; total: number }
    | ({ kind: "item"; key: string; share: number } & IAssetSourceItem);

export default function AssetsBreakdown() {
    const { assets, isSourcesLoading } = useDashboardContext();
    const isMobile = useIsMobile();

    const rows = useMemo<BreakdownRow[]>(() => {
        const toRows = (group: AssetGroup, items: IAssetSourceItem[], total: number) =>
            items.length === 0
                ? []
                : [
                      { kind: "group" as const, key: `group-${group}`, group, total },
                      ...items.map((item) => ({
                          ...item,
                          kind: "item" as const,
                          key: item._id,
                          share: assets.totalAssets ? item.amount / assets.totalAssets : 0,
                      })),
                  ];
        return [
            ...toRows("cash", assets.cashSources, assets.cashTotal),
            ...toRows("credit", assets.creditSources, assets.availableCreditTotal),
        ];
    }, [assets]);

    const columns = useMemo<ColumnsType<BreakdownRow>>(() => {
        // Group rows span the whole table width.
        const groupSpan = (row: BreakdownRow, span: number) => ({
            colSpan: row.kind === "group" ? span : 1,
        });
        const columnCount = isMobile ? 2 : 4;

        const renderGroup = (row: Extract<BreakdownRow, { kind: "group" }>) => (
            <span className="text-xs font-semibold text-muted-foreground">
                {GROUP_LABELS[row.group]} ·{" "}
                <span className={`tabular-nums ${GROUP_COLORS[row.group]}`}>
                    {formatMoney(row.total)}
                </span>
            </span>
        );

        return [
            {
                title: "Nguồn",
                key: "name",
                onCell: (row) => groupSpan(row, columnCount),
                render: (_, row) =>
                    row.kind === "group" ? (
                        renderGroup(row)
                    ) : (
                        <span className="font-medium">{row.name}</span>
                    ),
            },
            {
                title: "Loại",
                key: "type",
                responsive: ["md"],
                onCell: (row) => groupSpan(row, 0),
                render: (_, row) =>
                    row.kind === "item" ? (
                        <span className="text-muted-foreground">
                            {SOURCES_OF_MONEY_TYPE_LABELS[row.type]}
                        </span>
                    ) : null,
            },
            {
                title: "Có thể dùng",
                key: "amount",
                align: "right",
                onCell: (row) => groupSpan(row, 0),
                render: (_, row) =>
                    row.kind === "item" ? (
                        <span className="tabular-nums">{formatMoney(row.amount)}</span>
                    ) : null,
            },
            {
                title: "Tỷ trọng",
                key: "share",
                align: "right",
                responsive: ["md"],
                onCell: (row) => groupSpan(row, 0),
                render: (_, row) =>
                    row.kind === "item" ? (
                        <span className="text-muted-foreground tabular-nums">
                            {(row.share * 100).toLocaleString("vi-VN", {
                                maximumFractionDigits: 1,
                            })}
                            %
                        </span>
                    ) : null,
            },
        ];
    }, [isMobile]);

    const content = isSourcesLoading ? (
        <div className="flex h-32 items-center justify-center">
            <Spin />
        </div>
    ) : rows.length === 0 ? (
        <Empty description="Chưa có nguồn tiền nào còn số dư" />
    ) : (
        <Table<BreakdownRow>
            rowKey="key"
            size="small"
            columns={columns}
            dataSource={rows}
            pagination={false}
            scroll={{ x: "max-content" }}
        />
    );

    return (
        <div className="rounded-xl border border-border bg-background">
            <Collapse
                ghost
                defaultActiveKey={["breakdown"]}
                items={[
                    {
                        key: "breakdown",
                        label: (
                            <div>
                                <h2 className="text-base font-semibold">
                                    Chi tiết tài sản theo nguồn
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    Số liệu hiện tại, không phụ thuộc tháng đang chọn
                                </p>
                            </div>
                        ),
                        children: content,
                    },
                ]}
            />
        </div>
    );
}
