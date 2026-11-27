"use client";

import dayjs from "dayjs";
import { CalendarClock } from "lucide-react";
import type { IActionMenuItem } from "@/components/common/action-menu";
import Money from "@/components/common/money";
import Tag from "@/components/common/tag";
import TransactionRow from "@/components/common/grouped-transaction-list/components/transaction-row";
import { Button } from "@/components/shadcn/ui/button";
import { useExpensesContext } from "@/components/features/expenses/context";
import { getExpenseCategory, getExpenseSource } from "@/components/features/expenses/utils";
import { getCategoryColor } from "@/libs/utils/categoryColor";
import { formatDate } from "@/libs/utils/formatDate";
import type { IPlannedExpensesData } from "@/libs/interfaces/plannedExpensesData";

const ROW_ACTIONS: IActionMenuItem[] = [
    { key: "edit", label: "Sửa" },
    { key: "cancel", label: "Hủy khoản này", danger: true },
];

function isDue(record: IPlannedExpensesData) {
    return !dayjs(record.plannedAt).isAfter(dayjs(), "day");
}

/**
 * Khoản chi dự kiến đang giữ chỗ tiền. Tới ngày thì hiện nút Xác nhận (thành chi tiêu);
 * Hủy được bất cứ lúc nào. Ẩn khi không có khoản nào.
 */
export default function PlannedExpensesPanel() {
    const { plannedItems, openEditPlanned, handleConfirmPlanned, handleCancelPlanned } =
        useExpensesContext();

    if (plannedItems.length === 0) return null;
    const total = plannedItems.reduce((sum, item) => sum + item.amount, 0);
    const dueCount = plannedItems.filter(isDue).length;

    return (
        <section className="rounded-xl border bg-card">
            <header className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
                <CalendarClock className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Chi dự kiến</h2>
                {dueCount > 0 ? <Tag color="warning">{dueCount} khoản đến hạn</Tag> : null}
                <span className="ml-auto text-sm text-muted-foreground">
                    Đang giữ chỗ <Money value={total} kind="out" />
                </span>
            </header>
            <div className="divide-y">
                {plannedItems.map((record) => {
                    const category = getExpenseCategory(record);
                    const source = getExpenseSource(record);
                    const name = category?.name ?? "—";
                    const due = isDue(record);
                    return (
                        // Mobile: nút Xác nhận xuống dòng riêng, nếu không tên danh mục bị số tiền đè lên
                        <div key={record._id} className="flex flex-col pr-3 sm:flex-row sm:items-center sm:gap-2">
                            <div className="min-w-0 sm:flex-1">
                                <TransactionRow
                                    color={getCategoryColor(category?._id, category?.color)}
                                    icon={category?.icon || name.charAt(0).toUpperCase()}
                                    title={
                                        <>
                                            <span className="truncate">{name}</span>
                                            <Tag color={due ? "warning" : "default"}>
                                                {due ? "Đến hạn" : formatDate(record.plannedAt)}
                                            </Tag>
                                        </>
                                    }
                                    subtitle={
                                        [
                                            due ? formatDate(record.plannedAt) : null,
                                            source?.name,
                                            record.note,
                                        ]
                                            .filter(Boolean)
                                            .join(" · ") || "—"
                                    }
                                    columns={[source?.name, record.note]}
                                    amount={<Money value={-record.amount} kind="out" signed />}
                                    onClick={() => openEditPlanned(record)}
                                    actions={ROW_ACTIONS}
                                    onAction={(key) =>
                                        key === "edit"
                                            ? openEditPlanned(record)
                                            : handleCancelPlanned(record)
                                    }
                                />
                            </div>
                            {due ? (
                                <Button
                                    type="button"
                                    size="sm"
                                    className="mb-2.5 self-end sm:mb-0 sm:self-auto"
                                    onClick={() => handleConfirmPlanned(record)}
                                >
                                    Xác nhận
                                </Button>
                            ) : null}
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
