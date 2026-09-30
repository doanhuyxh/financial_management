"use client";

import { Button, Space, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { Pencil, Trash2 } from "lucide-react";
import { useIncomesContext } from "@/components/features/incomes/context";
import {
    formatMoney,
    getIncomeCategory,
    getIncomeSource,
} from "@/components/features/incomes/utils";
import type { IIncomesData } from "@/libs/interfaces/incomesData";
import {
    SOURCES_OF_MONEY_TYPE_LABELS,
    SourcesOfMoneyType,
} from "@/libs/interfaces/sourcesOfMoneyData";

export default function IncomesTable() {
    const {
        items,
        page,
        pageSize,
        pagination,
        isLoading,
        handleTableChange,
        openEditModal,
        handleDelete,
    } = useIncomesContext();

    const columns: ColumnsType<IIncomesData> = [
        {
            title: "STT",
            key: "index",
            width: 64,
            render: (_value, _record, index) => (page - 1) * pageSize + index + 1,
        },
        {
            title: "Ngày thu",
            dataIndex: "receivedAt",
            key: "receivedAt",
            width: 120,
            render: (value?: string) =>
                value ? new Date(value).toLocaleDateString("vi-VN") : "—",
        },
        {
            title: "Số tiền",
            dataIndex: "amount",
            key: "amount",
            width: 140,
            render: (amount: number) => (
                <span className="font-semibold text-emerald-600">{formatMoney(amount)}</span>
            ),
        },
        {
            title: "Danh mục",
            key: "category",
            render: (_value, record) => getIncomeCategory(record)?.name ?? "—",
        },
        {
            title: "Nguồn tiền",
            key: "source",
            render: (_value, record) => {
                const source = getIncomeSource(record);
                if (!source) return "—";
                return (
                    <div className="flex flex-col gap-0.5">
                        <span>{source.name}</span>
                        <Tag className="w-fit">
                            {SOURCES_OF_MONEY_TYPE_LABELS[source.type as SourcesOfMoneyType] ??
                                source.type}
                        </Tag>
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
    ];

    return (
        <Table<IIncomesData>
            rowKey="_id"
            columns={columns}
            dataSource={items}
            loading={isLoading}
            scroll={{ x: 900 }}
            pagination={{
                current: pagination?.page ?? page,
                pageSize: pagination?.limit ?? pageSize,
                total: pagination?.total ?? 0,
                showSizeChanger: true,
                pageSizeOptions: [10, 20, 50],
                showTotal: (total) => `Tổng ${total} khoản thu`,
            }}
            onChange={handleTableChange}
        />
    );
}
