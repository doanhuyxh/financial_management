"use client";

import { useCallback } from "react";
import { Button, Empty } from "antd";
import { Plus } from "lucide-react";
import Money from "@/components/common/money";
import GroupedTransactionList from "@/components/common/grouped-transaction-list";
import TransactionRow from "@/components/common/grouped-transaction-list/components/transaction-row";
import FeeTag from "@/components/features/expenses/components/expenses-table/components/fee-tag";
import { useExpensesContext } from "@/components/features/expenses/context";
import { getExpenseCategory, getExpenseSource } from "@/components/features/expenses/utils";
import type { IExpensesData } from "@/libs/interfaces/expensesData";
import { getCategoryColor } from "@/libs/utils/categoryColor";

const ROW_ACTIONS = [
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
                <Empty description="Chưa có khoản chi nào">
                    <Button type="primary" icon={<Plus className="size-4" />} onClick={openCreateModal}>
                        Thêm chi tiêu
                    </Button>
                </Empty>
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
                        color={getCategoryColor(category?._id)}
                        icon={name.charAt(0).toUpperCase()}
                        title={
                            <>
                                <span className="truncate">{name}</span>
                                <FeeTag record={record} />
                            </>
                        }
                        subtitle={[source?.name, record.note].filter(Boolean).join(" · ") || "—"}
                        amount={<Money value={-record.amount} kind="out" signed />}
                        onClick={locked ? undefined : () => openEditModal(record)}
                        lockedHint={locked ? "Sửa qua chuyển tiền" : undefined}
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
