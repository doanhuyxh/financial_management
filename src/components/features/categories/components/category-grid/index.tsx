"use client";

import { useId } from "react";
import { Button, Dropdown, Empty, Skeleton } from "antd";
import { GripVertical, MoreHorizontal, Plus } from "lucide-react";
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
    rectSortingStrategy,
    sortableKeyboardCoordinates,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Money from "@/components/common/money";
import { useCategoryContext } from "@/components/features/categories/context";
import { CategoryKind, type ICategoriesData } from "@/libs/interfaces/categoriesData";
import { getCategoryColor } from "@/libs/utils/categoryColor";
import { cn } from "@/libs/shadcn/utils";

function CategoryCard({ item, sortable }: { item: ICategoriesData; sortable: boolean }) {
    const { monthTotals, kindFilter, openEditModal, handleDelete } = useCategoryContext();
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
        useSortable({ id: item._id, disabled: !sortable });
    const color = getCategoryColor(item._id, item.color);
    const total = monthTotals[item._id] ?? 0;

    return (
        <div
            ref={setNodeRef}
            style={{ transform: CSS.Translate.toString(transform), transition }}
            {...attributes}
            className={cn(
                "flex items-center gap-2 rounded-xl border border-border bg-card p-2.5 pr-1.5",
                isDragging && "relative z-10 shadow-lg",
            )}
        >
            {sortable ? (
                <button
                    type="button"
                    ref={setActivatorNodeRef}
                    aria-label="Kéo để sắp xếp"
                    className="flex size-7 shrink-0 cursor-grab touch-none items-center justify-center rounded text-muted-foreground active:cursor-grabbing"
                    {...listeners}
                >
                    <GripVertical className="size-4" />
                </button>
            ) : null}
            <button
                type="button"
                onClick={() => openEditModal(item)}
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
            >
                <span
                    aria-hidden
                    className="flex size-9 shrink-0 items-center justify-center rounded-lg text-base font-semibold"
                    style={{ backgroundColor: `${color}1f`, color }}
                >
                    {item.icon || item.name.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0">
                    <span className="block truncate font-medium">{item.name}</span>
                    <span className="block text-xs text-muted-foreground">
                        {total ? (
                            <>
                                Tháng này{" "}
                                <Money
                                    value={total}
                                    kind={kindFilter === CategoryKind.INCOME ? "in" : "out"}
                                />
                            </>
                        ) : kindFilter === CategoryKind.INCOME ? (
                            "Chưa thu tháng này"
                        ) : (
                            "Chưa chi tháng này"
                        )}
                    </span>
                </span>
            </button>
            <Dropdown
                trigger={["click"]}
                placement="bottomRight"
                menu={{
                    items: [
                        { key: "edit", label: "Sửa" },
                        { key: "delete", label: "Xóa", danger: true },
                    ],
                    onClick: ({ key }) => (key === "edit" ? openEditModal(item) : handleDelete(item)),
                }}
            >
                <Button
                    type="text"
                    size="small"
                    aria-label="Thao tác"
                    className="shrink-0 text-muted-foreground"
                    icon={<MoreHorizontal className="size-4" />}
                />
            </Dropdown>
        </div>
    );
}

/** Lưới danh mục của tab đang xem; kéo tay cầm để sắp xếp (thứ tự dùng cho ô chọn trong form). */
export default function CategoryGrid() {
    const { items, isLoading, isReordering, canReorder, handleReorder, openCreateModal } =
        useCategoryContext();
    const dndContextId = useId();
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const onDragEnd = ({ active, over }: DragEndEvent) => {
        if (!canReorder || !over || active.id === over.id) return;
        const oldIndex = items.findIndex((item) => item._id === active.id);
        const newIndex = items.findIndex((item) => item._id === over.id);
        if (oldIndex < 0 || newIndex < 0) return;
        void handleReorder(arrayMove(items, oldIndex, newIndex));
    };

    if (isLoading && items.length === 0) {
        return <Skeleton active paragraph={{ rows: 6 }} />;
    }

    if (items.length === 0) {
        return (
            <div className="rounded-xl border border-border bg-card py-10">
                <Empty description="Chưa có danh mục nào">
                    <Button type="primary" icon={<Plus className="size-4" />} onClick={openCreateModal}>
                        Thêm danh mục
                    </Button>
                </Empty>
            </div>
        );
    }

    return (
        <div className={cn("flex flex-col gap-2", isReordering && "pointer-events-none opacity-70")}>
            <p className="text-xs text-muted-foreground">
                {canReorder
                    ? "Kéo để sắp xếp · thứ tự này dùng cho ô chọn danh mục trong form. Bấm vào danh mục để sửa tên, icon, màu."
                    : "Đang tìm kiếm nên tạm tắt kéo-thả."}
            </p>
            <DndContext
                id={dndContextId}
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={onDragEnd}
            >
                <SortableContext items={items.map((item) => item._id)} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                        {items.map((item) => (
                            <CategoryCard key={item._id} item={item} sortable={canReorder} />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>
        </div>
    );
}
