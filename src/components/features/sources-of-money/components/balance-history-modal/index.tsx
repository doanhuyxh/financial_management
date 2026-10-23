"use client";

import { Tag } from "antd";
import MobileRecordList from "@/components/common/mobile-record-list";
import ResponsiveModal from "@/components/common/responsive-modal";
import { useSourcesOfMoneyContext } from "@/components/features/sources-of-money/context";
import { BALANCE_ADJUSTMENT_FIELD_LABELS } from "@/libs/interfaces/balanceAdjustmentsData";
import { formatMoney } from "@/libs/utils/formatMoney";

export default function BalanceHistoryModal() {
    const {
        historySource,
        historyItems,
        historyPagination,
        isHistoryLoading,
        closeHistory,
        handleHistoryPageChange,
    } = useSourcesOfMoneyContext();

    return (
        <ResponsiveModal
            title={historySource ? `Lịch sử điều chỉnh: ${historySource.name}` : "Lịch sử điều chỉnh"}
            open={Boolean(historySource)}
            onCancel={closeHistory}
            footer={null}
            destroyOnHidden
            width={560}
        >
            <p className="mb-3 text-xs text-muted-foreground">
                Các lần sửa tay số dư/dư nợ trên form nguồn tiền. Thay đổi do chi tiêu, thu nhập và
                chuyển tiền không nằm ở đây.
            </p>
            <MobileRecordList
                items={historyItems}
                loading={isHistoryLoading}
                rowKey={(item) => item._id}
                pagination={{
                    current: historyPagination?.page ?? 1,
                    pageSize: historyPagination?.limit ?? 10,
                    total: historyPagination?.total ?? 0,
                    onChange: handleHistoryPageChange,
                }}
                renderItem={(item) => (
                    <div className="flex flex-col gap-1">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex flex-col gap-0.5">
                                <span className="text-xs text-muted-foreground">
                                    {new Date(item.adjustedAt).toLocaleString("vi-VN")}
                                </span>
                                <Tag className="w-fit">
                                    {BALANCE_ADJUSTMENT_FIELD_LABELS[item.field] ?? item.field}
                                </Tag>
                            </div>
                            <span
                                className={
                                    item.delta >= 0
                                        ? "font-semibold text-emerald-600"
                                        : "font-semibold text-rose-600"
                                }
                            >
                                {item.delta >= 0 ? "+" : "−"}
                                {formatMoney(Math.abs(item.delta))}
                            </span>
                        </div>
                        <p className="text-sm">
                            {formatMoney(item.previousValue)} → {formatMoney(item.newValue)}
                        </p>
                        {item.note ? (
                            <p className="text-xs text-muted-foreground">{item.note}</p>
                        ) : null}
                    </div>
                )}
            />
        </ResponsiveModal>
    );
}
