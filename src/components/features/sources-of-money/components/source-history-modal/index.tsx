"use client";

import { Button, Segmented, Tag } from "antd";
import { Share2 } from "lucide-react";
import DayRangeFilter from "@/components/common/day-range-filter";
import ResponsiveModal from "@/components/common/responsive-modal";
import SourceTransactionList from "@/components/common/source-transaction-list";
import SourceReconcilePanel from "@/components/features/sources-of-money/components/source-reconcile-panel";
import { useSourcesOfMoneyContext } from "@/components/features/sources-of-money/context";
import { CARD_FEE_TYPE_LABELS } from "@/libs/interfaces/expensesData";
import { SourcesOfMoneyType } from "@/libs/interfaces/sourcesOfMoneyData";
import {
    SOURCE_TRANSACTION_KIND_LABELS,
    SourceTransactionFilter,
    SourceTransactionKind,
    type ISourceTransactionData,
} from "@/libs/interfaces/sourceTransactionsData";
import { withArchivedLabel } from "@/libs/utils/archivedRef";
import { formatMoney } from "@/libs/utils/formatMoney";
import { getTrackedAmount } from "@/libs/utils/trackedAmount";

const KIND_OPTIONS: { value: SourceTransactionFilter | ""; label: string }[] = [
    { value: "", label: "Tất cả" },
    { value: SourceTransactionFilter.EXPENSE, label: "Chi" },
    { value: SourceTransactionFilter.INCOME, label: "Thu" },
    { value: SourceTransactionFilter.TRANSFER, label: "Chuyển" },
    { value: SourceTransactionFilter.ADJUSTMENT, label: "Điều chỉnh" },
];

/** Chỉ thẻ tín dụng mới có đáo hạn. */
const CREDIT_KIND_OPTIONS = [
    ...KIND_OPTIONS,
    { value: SourceTransactionFilter.ROLLOVER, label: "Đáo hạn" },
];

const KIND_TAG_COLORS: Record<SourceTransactionKind, string> = {
    [SourceTransactionKind.EXPENSE]: "red",
    [SourceTransactionKind.INCOME]: "green",
    [SourceTransactionKind.TRANSFER_OUT]: "orange",
    [SourceTransactionKind.TRANSFER_IN]: "blue",
    [SourceTransactionKind.ADJUSTMENT]: "default",
    [SourceTransactionKind.ROLLOVER]: "purple",
};

function TransactionMeta({ item }: { item: ISourceTransactionData }) {
    const counterpart = item.counterpartSource ? withArchivedLabel(item.counterpartSource) : null;
    const category = item.category ? withArchivedLabel(item.category) : null;

    return (
        <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            <Tag className="m-0" color={KIND_TAG_COLORS[item.kind]}>
                {SOURCE_TRANSACTION_KIND_LABELS[item.kind] ?? item.kind}
            </Tag>
            {item.cardFeeType ? (
                <Tag className="m-0" color="purple">
                    {CARD_FEE_TYPE_LABELS[item.cardFeeType] ?? item.cardFeeType}
                </Tag>
            ) : null}
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
        </div>
    );
}

export default function SourceHistoryModal() {
    const {
        historySource,
        historyKind,
        historyRange,
        historyItems,
        historyPagination,
        historySummary,
        isHistoryLoading,
        closeHistory,
        handleHistoryPageChange,
        handleHistoryKindChange,
        handleHistoryRangeChange,
        openShareModal,
    } = useSourcesOfMoneyContext();

    const isCreditCard = historySource?.type === SourcesOfMoneyType.CREDIT_CARD;

    return (
        <ResponsiveModal
            title={historySource ? `Lịch sử: ${historySource.name}` : "Lịch sử"}
            open={Boolean(historySource)}
            onCancel={closeHistory}
            footer={null}
            destroyOnHidden
            maskClosable={false}
            width={640}
        >
            <div className="mb-3 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">
                            {isCreditCard ? "Dư nợ hiện tại" : "Số dư hiện tại"}
                        </span>
                        <span className="text-lg font-semibold">
                            {historySource ? formatMoney(getTrackedAmount(historySource)) : "—"}
                        </span>
                    </div>
                    <Button icon={<Share2 className="size-4" />} onClick={openShareModal}>
                        Chia sẻ
                    </Button>
                </div>
                {historySource ? (
                    <SourceReconcilePanel
                        key={historySource._id}
                        sourceId={historySource._id}
                        isCreditCard={isCreditCard}
                    />
                ) : null}
                <Segmented
                    block
                    value={historyKind}
                    options={isCreditCard ? CREDIT_KIND_OPTIONS : KIND_OPTIONS}
                    onChange={(value) =>
                        handleHistoryKindChange(value as SourceTransactionFilter | "")
                    }
                />
                <DayRangeFilter value={historyRange} onChange={handleHistoryRangeChange} />
                {historySummary ? (
                    <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="rounded-md border px-3 py-2">
                            <p className="text-xs text-muted-foreground">
                                {isCreditCard ? "Phát sinh nợ" : "Tiền vào"}
                            </p>
                            <p
                                className={
                                    isCreditCard
                                        ? "money-value font-semibold text-money-out"
                                        : "money-value font-semibold text-money-in"
                                }
                            >
                                {formatMoney(historySummary.increase)}
                            </p>
                        </div>
                        <div className="rounded-md border px-3 py-2">
                            <p className="text-xs text-muted-foreground">
                                {isCreditCard ? "Giảm nợ" : "Tiền ra"}
                            </p>
                            <p
                                className={
                                    isCreditCard
                                        ? "money-value font-semibold text-money-in"
                                        : "money-value font-semibold text-money-out"
                                }
                            >
                                {formatMoney(historySummary.decrease)}
                            </p>
                        </div>
                    </div>
                ) : null}
            </div>
            <SourceTransactionList
                items={historyItems}
                loading={isHistoryLoading}
                isCreditCard={isCreditCard}
                rowKey={(item) => `${item.kind}-${item._id}`}
                renderMeta={(item) => <TransactionMeta item={item} />}
                pagination={{
                    current: historyPagination?.page ?? 1,
                    pageSize: historyPagination?.limit ?? 20,
                    total: historyPagination?.total ?? 0,
                    onChange: handleHistoryPageChange,
                }}
            />
        </ResponsiveModal>
    );
}
