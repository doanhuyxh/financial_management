"use client";

import { Button, Space, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { Pencil, Trash2 } from "lucide-react";
import { useExpensesContext } from "@/components/features/expenses/context";
import {
    formatMoney,
    getExpenseCategory,
    getExpenseSource,
} from "@/components/features/expenses/utils";
import type { IExpensesData } from "@/libs/interfaces/expensesData";
import {
    SOURCES_OF_MONEY_TYPE_LABELS,
    SourcesOfMoneyType,
} from "@/libs/interfaces/sourcesOfMoneyData";

export default function ExpensesTable() {
    const {
        items,
        page,
        pageSize,
        pagination,
        isLoading,
        handleTableChange,
        openEditModal,
        handleDelete,
    } = useExpensesContext();

    const columns: ColumnsType<IExpensesData> = [
        {
            title: "STT",
            key: "index",
            width: 64,
            render: (_value, _record, index) => (page - 1) * pageSize + index + 1,
        },
        {
            title: "Ngày chi",
            dataIndex: "spentAt",
            key: "spentAt",
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
                <span className="font-semibold text-rose-600">{formatMoney(amount)}</span>
            ),
        },
        {
            title: "Danh mục",
            key: "category",
            render: (_value, record) => getExpenseCategory(record)?.name ?? "—",
        },
        {
            title: "Nguồn tiền",
            key: "source",
            render: (_value, record) => {
                const source = getExpenseSource(record);
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
        <Table<IExpensesData>
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
                showTotal: (total) => `Tổng ${total} khoản chi`,
            }}
            onChange={handleTableChange}
        />
    );
}
