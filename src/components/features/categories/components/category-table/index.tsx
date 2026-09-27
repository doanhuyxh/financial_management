"use client";

import { useMemo } from "react";
import { Button, Space } from "antd";
import type { ColumnsType } from "antd/es/table";
import { Pencil, Trash2 } from "lucide-react";
import SortableTable from "@/components/common/sortable-table";
import { useCategoryContext } from "@/components/features/categories/context";
import type { ICategoriesData } from "@/libs/interfaces/categoriesData";

export default function CategoryTable() {
    const {
        items,
        isLoading,
        isReordering,
        handleReorder,
        openEditModal,
        handleDelete,
    } = useCategoryContext();

    const columns: ColumnsType<ICategoriesData> = useMemo(
        () => [
            {
                title: "STT",
                key: "index",
                width: 72,
                render: (_value, _record, index) => index + 1,
            },
            {
                title: "Tên danh mục",
                dataIndex: "name",
                key: "name",
                render: (name: string) => <span className="font-medium text-nowrap">{name}</span>,
            },
            {
                title: "Thao tác",
                key: "actions",
                width: 140,
                align: "center",
                className: "text-nowrap",
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
        <SortableTable<ICategoriesData>
            items={items}
            columns={columns}
            loading={isLoading || isReordering}
            onReorder={handleReorder}
            scroll={{ x: "max-content" }}
        />
    );
}
