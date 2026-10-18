"use client";

import { useMemo } from "react";
import { Button, Space } from "antd";
import { useIsMobile } from "@/libs/hooks/use-mobile";
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
        canReorder,
        handleReorder,
        openEditModal,
        handleDelete,
    } = useCategoryContext();
    const isMobile = useIsMobile();

    const columns: ColumnsType<ICategoriesData> = useMemo(
        () => [
            {
                title: "STT",
                key: "index",
                width: 72,
                responsive: ["md"],
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
                            size={isMobile ? "middle" : "small"}
                            aria-label="Sửa danh mục"
                            className={isMobile ? "size-10" : undefined}
                            icon={<Pencil className="size-4" />}
                            onClick={() => openEditModal(record)}
                        />
                        <Button
                            type="text"
                            size={isMobile ? "middle" : "small"}
                            danger
                            aria-label="Xóa danh mục"
                            className={isMobile ? "size-10" : undefined}
                            icon={<Trash2 className="size-4" />}
                            onClick={() => handleDelete(record)}
                        />
                    </Space>
                ),
            },
        ],
        [openEditModal, handleDelete, isMobile],
    );

    return (
        <SortableTable<ICategoriesData>
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
