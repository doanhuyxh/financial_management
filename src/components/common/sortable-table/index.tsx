"use client";

import React, { useId, useMemo } from "react";
import {
    DndContext,
    KeyboardSensor,
    PointerSensor,
    TouchSensor,
    closestCenter,
    useSensor,
    useSensors,
    type DragEndEvent,
} from "@dnd-kit/core";
import {
    SortableContext,
    arrayMove,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import DataTable, {
    type IDataTableColumn,
    type IDataTableProps,
    type IDataTableRowProps,
} from "@/components/common/data-table";

export interface ISortableItem {
    _id: string;
    sortOrder?: number;
}

function SortableRow({ children, ...props }: IDataTableRowProps) {
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
        ...(isDragging ? { position: "relative", zIndex: 9999, background: "var(--card)" } : {}),
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
                            aria-label="Kéo để sắp xếp"
                            className="inline-flex size-9 cursor-grab touch-none items-center justify-center rounded text-muted-foreground active:cursor-grabbing md:size-8"
                            {...listeners}
                        >
                            <GripVertical className="size-5 md:size-4" />
                        </button>
                    ),
                });
            })}
        </tr>
    );
}

// Module-level so DataTable doesn't see a new `components` object every render.
const TABLE_COMPONENTS = {
    row: SortableRow,
};

export function createSortColumn<T>(): IDataTableColumn<T> {
    return {
        key: "sort",
        width: 48,
        align: "center",
        title: "",
        className: "px-1",
    };
}

type SortableTableProps<T extends ISortableItem> = Omit<
    IDataTableProps<T>,
    "rowKey" | "dataSource" | "components"
> & {
    items: T[];
    onReorder: (nextItems: T[]) => void | Promise<void>;
    /** Hide drag handles, e.g. when `items` is a filtered subset of the full list. */
    reorderDisabled?: boolean;
};

export default function SortableTable<T extends ISortableItem>({
    items,
    columns,
    onReorder,
    reorderDisabled = false,
    ...tableProps
}: SortableTableProps<T>) {
    // Stable id: dnd-kit's global counter differs between SSR and client, causing a
    // hydration mismatch on the rows' `aria-describedby`.
    const dndContextId = useId();
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const mergedColumns = useMemo(() => {
        const sortColumn = createSortColumn<T>();
        const rest = (columns ?? []).filter((col) => col.key !== "sort");
        return reorderDisabled ? rest : [sortColumn, ...rest];
    }, [columns, reorderDisabled]);

    const itemIds = useMemo(() => items.map((item) => item._id), [items]);

    const onDragEnd = async ({ active, over }: DragEndEvent) => {
        if (reorderDisabled || !over || active.id === over.id) return;

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
        <DndContext id={dndContextId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                <DataTable<T>
                    rowKey="_id"
                    columns={mergedColumns}
                    dataSource={items}
                    components={TABLE_COMPONENTS}
                    {...tableProps}
                />
            </SortableContext>
        </DndContext>
    );
}
