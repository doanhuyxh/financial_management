"use client";

import { useCallback } from "react";
import { Plus } from "lucide-react";
import type { IActionMenuItem } from "@/components/common/action-menu";
import EmptyState from "@/components/common/empty-state";
import Money from "@/components/common/money";
import GroupedTransactionList from "@/components/common/grouped-transaction-list";
import TransactionRow from "@/components/common/grouped-transaction-list/components/transaction-row";
import { Button } from "@/components/shadcn/ui/button";
import FeeTag from "@/components/features/expenses/components/expenses-table/components/fee-tag";
import { useExpensesContext } from "@/components/features/expenses/context";
import { getExpenseCategory, getExpenseSource } from "@/components/features/expenses/utils";
import { CardFeeType, type IExpensesData } from "@/libs/interfaces/expensesData";
import { getCategoryColor } from "@/libs/utils/categoryColor";

const ROW_ACTIONS: IActionMenuItem[] = [
    { key: "edit", label: "Sửa" },
    { key: "delete", label: "Xóa", danger: true },
];

/** Danh sách chi tiêu nhóm theo ngày (desktop + mobile). Bấm dòng để sửa. */
export default function ExpensesTable() {
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
    } = useExpensesContext();

    const getDate = useCallback((record: IExpensesData) => record.spentAt, []);
    const getAmount = useCallback((record: IExpensesData) => record.amount, []);

    return (
        <GroupedTransactionList<IExpensesData>
            items={items}
            loading={isLoading}
            rowKey={(record) => record._id}
            getDate={getDate}
            getAmount={getAmount}
            dayTotals={dayTotals}
            totalKind="out"
            empty={
                <EmptyState description="Chưa có khoản chi nào">
                    <Button type="button" onClick={openCreateModal}>
                        <Plus data-icon="inline-start" />
                        Thêm chi tiêu
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
                const category = getExpenseCategory(record);
                const source = getExpenseSource(record);
                const locked = Boolean(record.skipBalanceAdjust);
                const name = category?.name ?? "—";
                return (
                    <TransactionRow
                        color={getCategoryColor(category?._id, category?.color)}
                        icon={category?.icon || name.charAt(0).toUpperCase()}
                        title={
                            <>
                                <span className="truncate">{name}</span>
                                <FeeTag record={record} />
                            </>
                        }
                        subtitle={[source?.name, record.note].filter(Boolean).join(" · ") || "—"}
                        columns={[source?.name, record.note]}
                        amount={<Money value={-record.amount} kind="out" signed />}
                        onClick={locked ? undefined : () => openEditModal(record)}
                        lockedHint={
                            locked
                                ? record.cardFeeType === CardFeeType.ROLLOVER_FEE
                                    ? "Sửa qua đáo hạn thẻ"
                                    : "Sửa qua chuyển tiền"
                                : undefined
                        }
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
