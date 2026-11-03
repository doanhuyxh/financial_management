"use client";

import { useCallback } from "react";
import { Button, Empty } from "antd";
import { ArrowLeftRight, Plus } from "lucide-react";
import Money from "@/components/common/money";
import GroupedTransactionList from "@/components/common/grouped-transaction-list";
import TransactionRow from "@/components/common/grouped-transaction-list/components/transaction-row";
import { useTransfersContext } from "@/components/features/transfers/context";
import {
    formatMoney,
    getTransferCategory,
    getTransferSource,
} from "@/components/features/transfers/utils";
import type { ITransfersData } from "@/libs/interfaces/transfersData";
import { OTHER_COLOR } from "@/libs/utils/categoryColor";

const ROW_ACTIONS = [{ key: "delete", label: "Xóa", danger: true }];

/** Danh sách chuyển tiền nhóm theo ngày (desktop + mobile). Chuyển tiền chỉ xóa, không sửa. */
export default function TransfersTable() {
    const {
        items,
        page,
        pageSize,
        pagination,
        dayTotals,
        isLoading,
        handleTableChange,
        openCreateModal,
        handleDelete,
    } = useTransfersContext();

    const getDate = useCallback((record: ITransfersData) => record.transferredAt, []);
    const getAmount = useCallback((record: ITransfersData) => record.amount, []);

    return (
        <GroupedTransactionList<ITransfersData>
            items={items}
            loading={isLoading}
            rowKey={(record) => record._id}
            getDate={getDate}
            getAmount={getAmount}
            dayTotals={dayTotals}
            totalKind="neutral"
            empty={
                <Empty description="Chưa có giao dịch chuyển tiền">
                    <Button type="primary" icon={<Plus className="size-4" />} onClick={openCreateModal}>
                        Chuyển tiền
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
                const from = getTransferSource(record.fromSourceId);
                const to = getTransferSource(record.toSourceId);
                const feeCategory = getTransferCategory(record.feeCategoryId);
                const fee = record.feeAmount
                    ? `Phí ${formatMoney(record.feeAmount)}${record.feePercent ? ` (${record.feePercent}%)` : ""}${feeCategory ? ` · ${feeCategory.name}` : ""}`
                    : null;
                return (
                    <TransactionRow
                        color={OTHER_COLOR}
                        icon={<ArrowLeftRight className="size-4" />}
                        title={
                            <span className="truncate">
                                {from?.name ?? "—"} → {to?.name ?? "—"}
                            </span>
                        }
                        subtitle={[fee, record.note].filter(Boolean).join(" · ") || "—"}
                        amount={<Money value={record.amount} />}
                        actions={ROW_ACTIONS}
                        onAction={() => handleDelete(record)}
                    />
                );
            }}
        />
    );
}
