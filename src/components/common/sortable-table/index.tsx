"use client";

import React, { useMemo } from "react";
import { Table } from "antd";
import type { ColumnsType, TableProps } from "antd/es/table";
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
import { GripVertical } from "lucide-react";

export interface ISortableItem {
    _id: string;
    sortOrder?: number;
}

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
        ...(isDragging
            ? { position: "relative", zIndex: 9999, background: "var(--ant-color-bg-container)" }
            : {}),
    };

    return (
        <tr {...props} ref={setNodeRef} style={style} {...attributes}>
            {React.Children.map(children, (child) => {
                if (!React.isValidElement(child)) return child;
                const cell = child as React.ReactElement<{
                    className?: string;
                    children?: React.ReactNode;
                }>;
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

export function createSortColumn<T>(): ColumnsType<T>[number] {
    return {
        key: "sort",
        width: 48,
        align: "center",
        title: "",
    };
}

type SortableTableProps<T extends ISortableItem> = Omit<
    TableProps<T>,
    "rowKey" | "dataSource" | "components" | "onRow"
> & {
    items: T[];
    onReorder: (nextItems: T[]) => void | Promise<void>;
};

export default function SortableTable<T extends ISortableItem>({
    items,
    columns,
    onReorder,
    pagination = false,
    ...tableProps
}: SortableTableProps<T>) {
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 6 },
        }),
    );

    const mergedColumns = useMemo(() => {
        const sortColumn = createSortColumn<T>();
        const rest = (columns ?? []).filter((col) => col.key !== "sort");
        return [sortColumn, ...rest];
    }, [columns]);

    const onDragEnd = async ({ active, over }: DragEndEvent) => {
        if (!over || active.id === over.id) return;

        const oldIndex = items.findIndex((item) => item._id === active.id);
        const newIndex = items.findIndex((item) => item._id === over.id);
        if (oldIndex < 0 || newIndex < 0) return;

        const nextItems = arrayMove(items, oldIndex, newIndex).map((item, index) => ({
            ...item,
            sortOrder: index,
        }));

        await onReorder(nextItems);
    };

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext
                items={items.map((item) => item._id)}
                strategy={verticalListSortingStrategy}
            >
                <Table<T>
                    rowKey="_id"
                    columns={mergedColumns}
                    dataSource={items}
                    pagination={pagination}
                    components={{
                        body: {
                            row: SortableRow,
                        },
                    }}
                    {...tableProps}
                />
            </SortableContext>
        </DndContext>
    );
}
