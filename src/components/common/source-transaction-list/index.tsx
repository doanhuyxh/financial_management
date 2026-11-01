"use client";

import type { ReactNode } from "react";
import type { PaginationProps } from "antd";
import MobileRecordList from "@/components/common/mobile-record-list";
import { formatMoney } from "@/libs/utils/formatMoney";

type SourceTransactionRow = { occurredAt: string; delta: number; note?: string };

type SourceTransactionListProps<T extends SourceTransactionRow> = {
    items: T[];
    loading?: boolean;
    /** Thẻ tín dụng: delta là biến động dư nợ, tăng là xấu (đỏ), giảm là tốt (xanh). */
    isCreditCard: boolean;
    rowKey: (item: T, index: number) => string;
    pagination?: PaginationProps;
    /** Thông tin thêm dưới nội dung (tag loại, danh mục...). Link public không truyền. */
    renderMeta?: (item: T) => ReactNode;
};

/** Danh sách lịch sử giao dịch của một nguồn tiền: thời gian, số tiền có dấu, nội dung. */
export default function SourceTransactionList<T extends SourceTransactionRow>({
    items,
    loading,
    isCreditCard,
    rowKey,
    pagination,
    renderMeta,
}: SourceTransactionListProps<T>) {
    const keyed = items.map((item, index) => ({ item, key: rowKey(item, index) }));

    return (
        <MobileRecordList
            items={keyed}
            loading={loading}
            rowKey={(row) => row.key}
            pagination={pagination}
            renderItem={({ item }) => {
                const isGood = isCreditCard ? item.delta < 0 : item.delta > 0;
                return (
                    <div className="flex flex-col gap-1">
                        <div className="flex items-start justify-between gap-3">
                            <span className="text-xs text-muted-foreground">
                                {new Date(item.occurredAt).toLocaleString("vi-VN", {
                                    timeZone: "Asia/Ho_Chi_Minh",
                                })}
                            </span>
                            <span
                                className={
                                    isGood
                                        ? "shrink-0 font-semibold text-emerald-600"
                                        : "shrink-0 font-semibold text-rose-600"
                                }
                            >
                                {item.delta >= 0 ? "+" : "−"}
                                {formatMoney(Math.abs(item.delta))}
                            </span>
                        </div>
                        <p className="text-sm break-words">{item.note || "—"}</p>
                        {renderMeta ? renderMeta(item) : null}
                    </div>
                );
            }}
        />
    );
}
