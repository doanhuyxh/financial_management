"use client";

import { useCallback } from "react";
import { Plus } from "lucide-react";
import type { IActionMenuItem } from "@/components/common/action-menu";
import EmptyState from "@/components/common/empty-state";
import Money from "@/components/common/money";
import GroupedTransactionList from "@/components/common/grouped-transaction-list";
import TransactionRow from "@/components/common/grouped-transaction-list/components/transaction-row";
import { Button } from "@/components/shadcn/ui/button";
import { useIncomesContext } from "@/components/features/incomes/context";
import { getIncomeCategory, getIncomeSource } from "@/components/features/incomes/utils";
import type { IIncomesData } from "@/libs/interfaces/incomesData";
import { getCategoryColor } from "@/libs/utils/categoryColor";

const ROW_ACTIONS: IActionMenuItem[] = [
    { key: "edit", label: "Sửa" },
    { key: "delete", label: "Xóa", danger: true },
];

/** Danh sách thu nhập nhóm theo ngày (desktop + mobile). Bấm dòng để sửa. */
export default function IncomesTable() {
    const {
        items,
        page,
        pageSize,
        pagination,
        dayTotals,
        isLoading,
        handleTableChange,
        openEditModal,
        openCreateModal,
        handleDelete,
    } = useIncomesContext();

    const getDate = useCallback((record: IIncomesData) => record.receivedAt, []);
    const getAmount = useCallback((record: IIncomesData) => record.amount, []);

    return (
        <GroupedTransactionList<IIncomesData>
            items={items}
            loading={isLoading}
            rowKey={(record) => record._id}
            getDate={getDate}
            getAmount={getAmount}
            dayTotals={dayTotals}
            totalKind="in"
            empty={
                <EmptyState description="Chưa có khoản thu nào">
                    <Button type="button" onClick={openCreateModal}>
                        <Plus data-icon="inline-start" />
                        Thêm thu nhập
                    </Button>
                </EmptyState>
            }
            pagination={{
                current: pagination?.page ?? page,
                pageSize: pagination?.limit ?? pageSize,
                total: pagination?.total ?? 0,
                onChange: (current, nextPageSize) =>
                    handleTableChange({ current, pageSize: nextPageSize }),
            }}
            renderRow={(record) => {
                const category = getIncomeCategory(record);
                const source = getIncomeSource(record);
                const name = category?.name ?? "—";
                return (
                    <TransactionRow
                        color={getCategoryColor(category?._id, category?.color)}
                        icon={category?.icon || name.charAt(0).toUpperCase()}
                        title={<span className="truncate">{name}</span>}
                        subtitle={[source?.name, record.note].filter(Boolean).join(" · ") || "—"}
                        columns={[source?.name, record.note]}
                        amount={<Money value={record.amount} kind="in" signed />}
                        onClick={() => openEditModal(record)}
                        actions={ROW_ACTIONS}
                        onAction={(key) =>
                            key === "edit" ? openEditModal(record) : handleDelete(record)
                        }
                    />
                );
            }}
        />
    );
}
