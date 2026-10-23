"use client";

import { useMemo } from "react";
import { Button, Space, Tag } from "antd";
import { useIsMobile } from "@/libs/hooks/use-mobile";
import { formatMoney } from "@/libs/utils/formatMoney";
import type { ColumnsType } from "antd/es/table";
import { History, Pencil, Trash2 } from "lucide-react";
import SortableTable from "@/components/common/sortable-table";
import { useSourcesOfMoneyContext } from "@/components/features/sources-of-money/context";
import {
    SOURCES_OF_MONEY_TYPE_LABELS,
    SourcesOfMoneyType,
    type ISourcesOfMoneyData,
} from "@/libs/interfaces/sourcesOfMoneyData";

const TYPE_COLORS: Record<SourcesOfMoneyType, string> = {
    [SourcesOfMoneyType.CASH]: "green",
    [SourcesOfMoneyType.BANK]: "blue",
    [SourcesOfMoneyType.CREDIT_CARD]: "purple",
    [SourcesOfMoneyType.E_WALLET]: "cyan",
    [SourcesOfMoneyType.OTHER]: "default",
};

export default function SourcesOfMoneyTable() {
    const {
        items,
        isLoading,
        isReordering,
        canReorder,
        handleReorder,
        openEditModal,
        openHistory,
        handleDelete,
    } = useSourcesOfMoneyContext();
    const isMobile = useIsMobile();

    const columns: ColumnsType<ISourcesOfMoneyData> = useMemo(
        () => [
            {
                title: "STT",
                key: "index",
                width: 64,
                responsive: ["md"],
                render: (_value, _record, index) => index + 1,
            },
            {
                title: "Tên",
                dataIndex: "name",
                key: "name",
                render: (name: string) => <span className="font-medium">{name}</span>,
            },
            {
                title: "Loại",
                dataIndex: "type",
                key: "type",
                width: 140,
                responsive: ["md"],
                render: (type: SourcesOfMoneyType) => (
                    <Tag color={TYPE_COLORS[type]}>{SOURCES_OF_MONEY_TYPE_LABELS[type]}</Tag>
                ),
            },
            {
                title: "Số dư / Hạn mức",
                key: "balanceInfo",
                render: (_value, record) => {
                    if (record.type === SourcesOfMoneyType.CREDIT_CARD) {
                        const limit = record.creditDetails?.creditLimit ?? 0;
                        const debt = record.creditDetails?.currentDebt ?? 0;
                        const available =
                            record.availableCreditLimit ?? Math.max(0, limit - debt);
                        return (
                            <div className="text-sm leading-5">
                                <div className="font-semibold text-orange-500">
                                    Dư nợ: {formatMoney(debt)}
                                </div>
                                <div className="text-muted-foreground">
                                    Hạn mức: {formatMoney(limit)} · Còn lại:{" "}
                                    {formatMoney(available)}
                                </div>
                            </div>
                        );
                    }
                    return formatMoney(record.balance);
                },
            },
            {
                title: "Thao tác",
                key: "actions",
                width: 150,
                align: "right",
                render: (_value, record) => (
                    <Space size="small">
                        <Button
                            type="text"
                            size={isMobile ? "middle" : "small"}
                            aria-label="Lịch sử điều chỉnh"
                            title="Lịch sử điều chỉnh"
                            className={isMobile ? "size-10" : undefined}
                            icon={<History className="size-4" />}
                            onClick={() => openHistory(record)}
                        />
                        <Button
                            type="text"
                            size={isMobile ? "middle" : "small"}
                            aria-label="Sửa nguồn tiền"
                            className={isMobile ? "size-10" : undefined}
                            icon={<Pencil className="size-4" />}
                            onClick={() => openEditModal(record)}
                        />
                        <Button
                            type="text"
                            size={isMobile ? "middle" : "small"}
                            danger
                            aria-label="Xóa nguồn tiền"
                            className={isMobile ? "size-10" : undefined}
                            icon={<Trash2 className="size-4" />}
                            onClick={() => handleDelete(record)}
                        />
                    </Space>
                ),
            },
        ],
        [openEditModal, openHistory, handleDelete, isMobile],
    );

    return (
        <SortableTable<ISourcesOfMoneyData>
            items={items}
            columns={columns}
            size={isMobile ? "small" : "middle"}
            loading={isLoading || isReordering}
            onReorder={handleReorder}
            reorderDisabled={!canReorder}
            scroll={{ x: "max-content" }}
        />
    );
}
