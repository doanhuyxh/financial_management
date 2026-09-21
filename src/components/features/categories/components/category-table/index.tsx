"use client";

import React, { useMemo } from "react";
import { Button, Space, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
    DndContext,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
    type DragEndEvent,
} from "@dnd-kit/core";
import {
    SortableContext,
    arrayMove,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { useCategoryContext } from "@/components/features/categories/context";
import type { ICategoriesData } from "@/libs/interfaces/categoriesData";

interface RowProps extends React.HTMLAttributes<HTMLTableRowElement> {
    "data-row-key": string;
}

function SortableRow({ children, ...props }: RowProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        setActivatorNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: props["data-row-key"] });

    const style: React.CSSProperties = {
        ...props.style,
        transform: CSS.Translate.toString(transform),
        transition,
        ...(isDragging ? { position: "relative", zIndex: 9999, background: "var(--ant-color-bg-container)" } : {}),
    };

    return (
        <tr {...props} ref={setNodeRef} style={style} {...attributes}>
            {React.Children.map(children, (child) => {
                if (!React.isValidElement(child)) return child;
                const cell = child as React.ReactElement<{ className?: string; children?: React.ReactNode }>;
                if (cell.key !== "sort") return child;

                return React.cloneElement(cell, {
                    children: (
                        <button
                            type="button"
                            ref={setActivatorNodeRef}
                            className="inline-flex cursor-grab items-center justify-center rounded p-1 text-muted-foreground active:cursor-grabbing"
                            {...listeners}
                        >
                            <GripVertical className="size-4" />
                        </button>
                    ),
                });
            })}
        </tr>
    );
}

export default function CategoryTable() {
    const {
        items,
        isLoading,
        isReordering,
        handleReorder,
        openEditModal,
        handleDelete,
    } = useCategoryContext();

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 6 },
        }),
    );

    const columns: ColumnsType<ICategoriesData> = useMemo(
        () => [
            {
                key: "sort",
                width: 48,
                align: "center",
                title: "",
            },
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
        ],
        [openEditModal, handleDelete],
    );

    const onDragEnd = async ({ active, over }: DragEndEvent) => {
        if (!over || active.id === over.id) return;

        const oldIndex = items.findIndex((item) => item._id === active.id);
        const newIndex = items.findIndex((item) => item._id === over.id);
        if (oldIndex < 0 || newIndex < 0) return;

        const nextItems = arrayMove(items, oldIndex, newIndex).map((item, index) => ({
            ...item,
            sortOrder: index,
        }));

        await handleReorder(nextItems);
    };

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext
                items={items.map((item) => item._id)}
                strategy={verticalListSortingStrategy}
            >
                <Table<ICategoriesData>
                    rowKey="_id"
                    columns={columns}
                    dataSource={items}
                    loading={isLoading || isReordering}
                    pagination={false}
                    components={{
                        body: {
                            row: SortableRow,
                        },
                    }}
                />
            </SortableContext>
        </DndContext>
    );
}
