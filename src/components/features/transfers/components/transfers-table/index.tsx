"use client";

import { useMemo } from "react";
import { Button, Space, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { Trash2 } from "lucide-react";
import { useTransfersContext } from "@/components/features/transfers/context";
import {
    formatMoney,
    getTransferCategory,
    getTransferSource,
} from "@/components/features/transfers/utils";
import type { ITransfersData } from "@/libs/interfaces/transfersData";
import {
    SOURCES_OF_MONEY_TYPE_LABELS,
    SourcesOfMoneyType,
} from "@/libs/interfaces/sourcesOfMoneyData";

export default function TransfersTable() {
    const {
        items,
        page,
        pageSize,
        pagination,
        isLoading,
        handleTableChange,
        handleDelete,
    } = useTransfersContext();

    const columns: ColumnsType<ITransfersData> = useMemo(
        () => [
            {
                title: "STT",
                key: "index",
                width: 64,
                render: (_value, _record, index) => (page - 1) * pageSize + index + 1,
            },
            {
                title: "Ngày chuyển",
                dataIndex: "transferredAt",
                key: "transferredAt",
                width: 120,
                render: (value?: string) =>
                    value ? new Date(value).toLocaleDateString("vi-VN") : "—",
            },
            {
                title: "Từ",
                key: "from",
                render: (_value, record) => {
                    const source = getTransferSource(record.fromSourceId);
                    if (!source) return "—";
                    return (
                        <div className="flex flex-col gap-0.5">
                            <span>{source.name}</span>
                            <Tag className="w-fit">
                                {SOURCES_OF_MONEY_TYPE_LABELS[
                                    source.type as SourcesOfMoneyType
                                ] ?? source.type}
                            </Tag>
                        </div>
                    );
                },
            },
            {
                title: "Đến",
                key: "to",
                render: (_value, record) => {
                    const source = getTransferSource(record.toSourceId);
                    if (!source) return "—";
                    return (
                        <div className="flex flex-col gap-0.5">
                            <span>{source.name}</span>
                            <Tag className="w-fit">
                                {SOURCES_OF_MONEY_TYPE_LABELS[
                                    source.type as SourcesOfMoneyType
                                ] ?? source.type}
                            </Tag>
                        </div>
                    );
                },
            },
            {
                title: "Số tiền",
                dataIndex: "amount",
                key: "amount",
                width: 140,
                render: (amount: number) => (
                    <span className="font-semibold">{formatMoney(amount)}</span>
                ),
            },
            {
                title: "Phí",
                key: "fee",
                width: 160,
                render: (_value, record) => {
                    if (!record.feeAmount) return "—";
                    const category = getTransferCategory(record.feeCategoryId);
                    return (
                        <div className="flex flex-col gap-0.5">
                            <span className="text-rose-600">
                                {formatMoney(record.feeAmount)}
                                {record.feePercent
                                    ? ` (${record.feePercent}%)`
                                    : ""}
                            </span>
                            {category ? (
                                <span className="text-xs text-muted-foreground">
                                    {category.name}
                                </span>
                            ) : null}
                        </div>
                    );
                },
            },
            {
                title: "Ghi chú",
                dataIndex: "note",
                key: "note",
                ellipsis: true,
                render: (note?: string) => note || "—",
            },
            {
                title: "Thao tác",
                key: "actions",
                width: 100,
                align: "right",
                render: (_value, record) => (
                    <Space size="small">
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
        [page, pageSize, handleDelete],
    );

    return (
        <Table<ITransfersData>
            rowKey="_id"
            columns={columns}
            dataSource={items}
            loading={isLoading}
            scroll={{ x: 1000 }}
            pagination={{
                current: pagination?.page ?? page,
                pageSize: pagination?.limit ?? pageSize,
                total: pagination?.total ?? 0,
                showSizeChanger: true,
                pageSizeOptions: [10, 20, 50],
                showTotal: (total) => `Tổng ${total} giao dịch`,
            }}
            onChange={handleTableChange}
        />
    );
}
