"use client";

import React, { useMemo } from "react";
import { Button, Space, Table, Tag } from "antd";
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
import { useSourcesOfMoneyContext } from "@/components/features/sources-of-money/context";
import {
    SOURCES_OF_MONEY_TYPE_LABELS,
    SourcesOfMoneyType,
    type ISourcesOfMoneyData,
} from "@/libs/interfaces/sourcesOfMoneyData";

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
});

function formatMoney(value?: number | null) {
    if (value == null || Number.isNaN(value)) return "—";
    return currencyFormatter.format(value);
}

const TYPE_COLORS: Record<SourcesOfMoneyType, string> = {
    [SourcesOfMoneyType.CASH]: "green",
    [SourcesOfMoneyType.BANK]: "blue",
    [SourcesOfMoneyType.CREDIT_CARD]: "purple",
    [SourcesOfMoneyType.E_WALLET]: "cyan",
    [SourcesOfMoneyType.OTHER]: "default",
};

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

export default function SourcesOfMoneyTable() {
    const {
        items,
        isLoading,
        isReordering,
        handleReorder,
        openEditModal,
        handleDelete,
    } = useSourcesOfMoneyContext();

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 6 },
        }),
    );

    const columns: ColumnsType<ISourcesOfMoneyData> = useMemo(
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
                width: 64,
                render: (_value, _record, index) => index + 1,
            },
            {
                title: "Tên",
                dataIndex: "name",
                key: "name",
                render: (name: string) => <span className="font-medium">{name}</span>,
            },
            {
                title: "Loại",
                dataIndex: "type",
                key: "type",
                width: 140,
                render: (type: SourcesOfMoneyType) => (
                    <Tag color={TYPE_COLORS[type]}>{SOURCES_OF_MONEY_TYPE_LABELS[type]}</Tag>
                ),
            },
            {
                title: "Số dư / Hạn mức",
                key: "balanceInfo",
                render: (_value, record) => {
                    if (record.type === SourcesOfMoneyType.CREDIT_CARD) {
                        const limit = record.creditDetails?.creditLimit ?? 0;
                        const debt = record.creditDetails?.currentDebt ?? 0;
                        const available =
                            record.availableCreditLimit ?? Math.max(0, limit - debt);
                        return (
                            <div className="text-sm leading-5">
                                <div>Hạn mức: {formatMoney(limit)}</div>
                                <div className="text-muted-foreground">
                                    Dư nợ: {formatMoney(debt)} · Còn lại: {formatMoney(available)}
                                </div>
                            </div>
                        );
                    }
                    return formatMoney(record.balance);
                },
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
                <Table<ISourcesOfMoneyData>
                    rowKey="_id"
                    columns={columns}
                    dataSource={items}
                    loading={isLoading || isReordering}
                    scroll={{ x: 800 }}
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
