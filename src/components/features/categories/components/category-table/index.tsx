"use client";

import { Button, Space, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { Pencil, Trash2 } from "lucide-react";
import { useCategoryContext } from "@/components/features/categories/context";
import type { ICategoriesData } from "@/libs/interfaces/categoriesData";

export default function CategoryTable() {
    const {
        items,
        page,
        pageSize,
        pagination,
        isLoading,
        handleTableChange,
        openEditModal,
        handleDelete,
    } = useCategoryContext();

    const columns: ColumnsType<ICategoriesData> = [
        {
            title: "STT",
            key: "index",
            width: 72,
            render: (_value, _record, index) => (page - 1) * pageSize + index + 1,
        },
        {
            title: "Tên danh mục",
            dataIndex: "name",
            key: "name",
            render: (name: string) => <span className="font-medium">{name}</span>,
        },
        {
            title: "Ngày tạo",
            dataIndex: "createdAt",
            key: "createdAt",
            width: 180,
            render: (value?: string) =>
                value ? new Date(value).toLocaleString("vi-VN") : "—",
        },
        {
            title: "Thao tác",
            key: "actions",
            width: 140,
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
        <Table<ICategoriesData>
            rowKey="_id"
            columns={columns}
            dataSource={items}
            loading={isLoading}
            pagination={{
                current: pagination?.page ?? page,
                pageSize: pagination?.limit ?? pageSize,
                total: pagination?.total ?? 0,
                showSizeChanger: true,
                pageSizeOptions: [10, 20, 50],
                showTotal: (total) => `Tổng ${total} danh mục`,
            }}
            onChange={handleTableChange}
        />
    );
}
