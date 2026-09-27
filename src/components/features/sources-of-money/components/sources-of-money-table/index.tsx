"use client";

import { useMemo } from "react";
import { Button, Space, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { Pencil, Trash2 } from "lucide-react";
import SortableTable from "@/components/common/sortable-table";
import { useSourcesOfMoneyContext } from "@/components/features/sources-of-money/context";
import {
    SOURCES_OF_MONEY_TYPE_LABELS,
    SourcesOfMoneyType,
    type ISourcesOfMoneyData,
} from "@/libs/interfaces/sourcesOfMoneyData";

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
});

function formatMoney(value?: number | null) {
    if (value == null || Number.isNaN(value)) return "—";
    return currencyFormatter.format(value);
}

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
        handleReorder,
        openEditModal,
        handleDelete,
    } = useSourcesOfMoneyContext();

    const columns: ColumnsType<ISourcesOfMoneyData> = useMemo(
        () => [
            {
                title: "STT",
                key: "index",
                width: 64,
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
                                <div>Hạn mức: {formatMoney(limit)}</div>
                                <div className="text-muted-foreground">
                                    Dư nợ: {formatMoney(debt)} · Còn lại: {formatMoney(available)}
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
                width: 120,
                align: "right",
                render: (_value, record) => (
                    <Space size="small">
                        <Button
                            type="text"
                            size="small"
                            icon={<Pencil className="size-4" />}
                            onClick={() => openEditModal(record)}
                        />
                        <Button
                            type="text"
                            size="small"
                            danger
                            icon={<Trash2 className="size-4" />}
                            onClick={() => handleDelete(record)}
                        />
                    </Space>
                ),
            },
        ],
        [openEditModal, handleDelete],
    );

    return (
        <SortableTable<ISourcesOfMoneyData>
            items={items}
            columns={columns}
            loading={isLoading || isReordering}
            onReorder={handleReorder}
            scroll={{ x: 800 }}
        />
    );
}
