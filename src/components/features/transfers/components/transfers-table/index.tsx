"use client";

import { useMemo } from "react";
import { Button, Space, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { Trash2 } from "lucide-react";
import MobileRecordList from "@/components/common/mobile-record-list";
import { useTransfersContext } from "@/components/features/transfers/context";
import { useIsMobile } from "@/libs/hooks/use-mobile";
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
    const isMobile = useIsMobile();

    const columns: ColumnsType<ITransfersData> = useMemo(
        () => [
            {
                title: "STT",
                key: "index",
                width: 64,
                responsive: ["md"],
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
                responsive: ["md"],
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
                            aria-label="Xóa chuyển tiền"
                            icon={<Trash2 className="size-4" />}
                            onClick={() => handleDelete(record)}
                        />
                    </Space>
                ),
            },
        ],
        [page, pageSize, handleDelete],
    );

    const pager = {
        current: pagination?.page ?? page,
        pageSize: pagination?.limit ?? pageSize,
        total: pagination?.total ?? 0,
        onChange: (current: number, nextPageSize: number) =>
            handleTableChange({ current, pageSize: nextPageSize }),
    };

    if (isMobile) {
        return (
            <MobileRecordList
                items={items}
                loading={isLoading}
                rowKey={(item) => item._id}
                pagination={pager}
                renderItem={(record) => {
                    const from = getTransferSource(record.fromSourceId);
                    const to = getTransferSource(record.toSourceId);
                    return (
                        <div className="flex flex-col gap-1">
                            <div className="flex items-start justify-between gap-3">
                                <span className="font-semibold">
                                    {from?.name ?? "—"} → {to?.name ?? "—"}
                                </span>
                                <span className="font-semibold">{formatMoney(record.amount)}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {record.transferredAt
                                    ? new Date(record.transferredAt).toLocaleDateString("vi-VN")
                                    : "—"}
                                {record.feeAmount ? ` · Phí ${formatMoney(record.feeAmount)}` : ""}
                            </p>
                            <div className="flex items-end justify-between gap-2">
                                <p className="line-clamp-2 text-xs text-muted-foreground">
                                    {record.note || "Không có ghi chú"}
                                </p>
                                <Button
                                    type="text"
                                    size="middle"
                                    danger
                                    aria-label="Xóa chuyển tiền"
                                    className="size-10"
                                    icon={<Trash2 className="size-4" />}
                                    onClick={() => handleDelete(record)}
                                />
                            </div>
                        </div>
                    );
                }}
            />
        );
    }

    return (
        <Table<ITransfersData>
            rowKey="_id"
            size="middle"
            columns={columns}
            dataSource={items}
            loading={isLoading}
            scroll={{ x: "max-content" }}
            pagination={{
                ...pager,
                showSizeChanger: true,
                pageSizeOptions: [10, 20, 50],
                showTotal: (total) => `Tổng ${total} giao dịch`,
            }}
            onChange={handleTableChange}
        />
    );
}
