"use client";

import { useMemo } from "react";
import dayjs from "dayjs";
import EmptyState from "@/components/common/empty-state";
import LoadingOverlay from "@/components/common/loading-overlay";
import AppPagination from "@/components/common/pagination";
import SourceTransactionList from "@/components/common/source-transaction-list";
import Tag, { type TagColor } from "@/components/common/tag";
import { useSourceHistoryContext } from "@/components/features/source-history/context";
import { CARD_FEE_TYPE_LABELS } from "@/libs/interfaces/expensesData";
import {
    SOURCE_TRANSACTION_KIND_LABELS,
    SourceTransactionKind,
    type ISourceTransactionData,
} from "@/libs/interfaces/sourceTransactionsData";
import { cn } from "@/libs/shadcn/utils";
import { withArchivedLabel } from "@/libs/utils/archivedRef";
import { formatMoney } from "@/libs/utils/formatMoney";

const TIME_ZONE = "Asia/Ho_Chi_Minh";
const WEEKDAYS = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"];
const ROW_GRID =
    "grid grid-cols-[64px_minmax(120px,auto)_minmax(0,1fr)_minmax(0,1.5fr)_140px] items-center gap-4 px-4";

// Plan 21: chi tiêu / chuyển đi là việc bình thường → xám (không đỏ/cam như cảnh báo)
const KIND_TAG_COLORS: Record<SourceTransactionKind, TagColor> = {
    [SourceTransactionKind.EXPENSE]: "default",
    [SourceTransactionKind.INCOME]: "green",
    [SourceTransactionKind.TRANSFER_OUT]: "default",
    [SourceTransactionKind.TRANSFER_IN]: "blue",
    [SourceTransactionKind.ADJUSTMENT]: "default",
    [SourceTransactionKind.ROLLOVER]: "purple",
};

/** Ngày (giờ VN) của giao dịch dạng YYYY-MM-DD, dùng để nhóm. */
function dayKey(value: string) {
    return new Date(value).toLocaleDateString("en-CA", { timeZone: TIME_ZONE });
}

function formatTime(value: string) {
    return new Date(value).toLocaleTimeString("vi-VN", {
        timeZone: TIME_ZONE,
        hour: "2-digit",
        minute: "2-digit",
    });
}

function formatDayLabel(key: string) {
    const date = dayjs(key);
    return `${WEEKDAYS[date.day()]}, ${date.format("DD/MM/YYYY")}`;
}

function KindTags({ item }: { item: ISourceTransactionData }) {
    return (
        <>
            <Tag color={KIND_TAG_COLORS[item.kind]}>
                {SOURCE_TRANSACTION_KIND_LABELS[item.kind] ?? item.kind}
            </Tag>
            {item.cardFeeType ? (
                <Tag color="purple">{CARD_FEE_TYPE_LABELS[item.cardFeeType] ?? item.cardFeeType}</Tag>
            ) : null}
        </>
    );
}

/** Danh mục, nguồn đối ứng, phí, số đáo hạn hoặc số trước/sau điều chỉnh của một dòng. */
function TransactionDetail({ item }: { item: ISourceTransactionData }) {
    const counterpart = item.counterpartSource ? withArchivedLabel(item.counterpartSource) : null;
    const category = item.category ? withArchivedLabel(item.category) : null;

    return (
        <>
            {category ? <span>{category.name}</span> : null}
            {counterpart ? (
                <span>
                    {item.kind === SourceTransactionKind.TRANSFER_OUT ? "→ " : "← "}
                    {counterpart.name}
                </span>
            ) : null}
            {item.kind === SourceTransactionKind.ROLLOVER ? (
                <span>
                    Đáo {formatMoney(item.rolloverAmount)}
                    {item.provider ? ` · ${item.provider}` : ""}
                </span>
            ) : item.feeAmount ? (
                <span>· Phí {formatMoney(item.feeAmount)}</span>
            ) : null}
            {item.kind === SourceTransactionKind.ADJUSTMENT ? (
                <span>
                    {formatMoney(item.previousValue)} → {formatMoney(item.newValue)}
                </span>
            ) : null}
        </>
    );
}

function SignedAmount({ delta, isCreditCard, className }: { delta: number; isCreditCard: boolean; className?: string }) {
    // Thẻ tín dụng: delta là biến động dư nợ, giảm là tốt (xanh). Tiền ra / phát sinh nợ là chi tiêu
    // bình thường → màu chữ thường (plan 21), không tô đỏ
    const isGood = isCreditCard ? delta < 0 : delta > 0;
    return (
        <span
            className={cn(
                "money-value font-semibold tabular-nums",
                delta === 0 ? "text-muted-foreground" : isGood ? "text-money-in" : undefined,
                className,
            )}
        >
            {delta >= 0 ? "+" : "−"}
            {formatMoney(Math.abs(delta))}
        </span>
    );
}

/**
 * Danh sách giao dịch của nguồn. Từ `lg`: bảng nhóm theo ngày, mỗi thông tin một cột.
 * Nhỏ hơn: danh sách thẻ dùng chung với link chia sẻ public.
 */
export default function HistoryList() {
    const { items, isLoading, isCreditCard, pagination, handlePageChange } = useSourceHistoryContext();

    // Tổng mỗi ngày chỉ cộng các dòng trong trang đang xem
    const groups = useMemo(() => {
        const result: { key: string; items: ISourceTransactionData[]; net: number }[] = [];
        for (const item of items) {
            const key = dayKey(item.occurredAt);
            let group = result[result.length - 1];
            if (!group || group.key !== key) {
                group = { key, items: [], net: 0 };
                result.push(group);
            }
            group.items.push(item);
            group.net += item.delta;
        }
        return result;
    }, [items]);

    const paginationProps = {
        current: pagination?.page ?? 1,
        pageSize: pagination?.limit ?? 20,
        total: pagination?.total ?? 0,
        onChange: handlePageChange,
    };

    return (
        <>
            <div className="hidden lg:block">
                <LoadingOverlay loading={isLoading}>
                    <section className="overflow-hidden rounded-xl border border-border bg-card">
                        <div
                            className={cn(
                                ROW_GRID,
                                "border-b border-border py-2 text-xs font-medium text-muted-foreground",
                            )}
                        >
                            <span>Giờ</span>
                            <span>Loại</span>
                            <span>Danh mục / Đối ứng</span>
                            <span>Nội dung</span>
                            <span className="text-right">Số tiền</span>
                        </div>
                        {groups.length === 0 ? (
                            <div className="py-10">
                                <EmptyState description="Không có giao dịch" />
                            </div>
                        ) : (
                            groups.map((group) => (
                                <div key={group.key}>
                                    <div className="flex items-center justify-between gap-3 border-b border-border bg-muted px-4 py-1.5 text-xs font-semibold text-muted-foreground">
                                        <span>{formatDayLabel(group.key)}</span>
                                        <SignedAmount delta={group.net} isCreditCard={isCreditCard} />
                                    </div>
                                    {group.items.map((item) => (
                                        <div
                                            key={`${item.kind}-${item._id}`}
                                            className={cn(
                                                ROW_GRID,
                                                "border-b border-border py-2.5 text-sm last:border-b-0 hover:bg-muted/50",
                                            )}
                                        >
                                            <span className="text-xs text-muted-foreground tabular-nums">
                                                {formatTime(item.occurredAt)}
                                            </span>
                                            <span className="flex flex-wrap items-center gap-1">
                                                <KindTags item={item} />
                                            </span>
                                            <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-muted-foreground">
                                                <TransactionDetail item={item} />
                                            </span>
                                            <span className="min-w-0 break-words">
                                                {item.note || <span className="text-muted-foreground">—</span>}
                                            </span>
                                            <SignedAmount
                                                delta={item.delta}
                                                isCreditCard={isCreditCard}
                                                className="text-right"
                                            />
                                        </div>
                                    ))}
                                </div>
                            ))
                        )}
                    </section>
                    {paginationProps.total > 0 ? (
                        <div className="mt-4 flex justify-end">
                            <AppPagination {...paginationProps} showSizeChanger={false} />
                        </div>
                    ) : null}
                </LoadingOverlay>
            </div>
            <div className="lg:hidden">
                <SourceTransactionList
                    items={items}
                    loading={isLoading}
                    isCreditCard={isCreditCard}
                    rowKey={(item) => `${item.kind}-${item._id}`}
                    renderMeta={(item) => (
                        <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                            <KindTags item={item} />
                            <TransactionDetail item={item} />
                        </div>
                    )}
                    pagination={paginationProps}
                />
            </div>
        </>
    );
}
