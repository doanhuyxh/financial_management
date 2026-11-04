"use client";

import { useMemo } from "react";
import { Button, Dropdown, Progress } from "antd";
import type { ColumnsType } from "antd/es/table";
import { History, MoreHorizontal, QrCode } from "lucide-react";
import Money from "@/components/common/money";
import SortableTable from "@/components/common/sortable-table";
import { useSourcesOfMoneyContext } from "@/components/features/sources-of-money/context";
import CardFeeDetails from "@/components/features/sources-of-money/components/sources-of-money-table/components/card-fee-details";
import {
    SOURCES_OF_MONEY_TYPE_LABELS,
    SourcesOfMoneyType,
    type ISourcesOfMoneyData,
} from "@/libs/interfaces/sourcesOfMoneyData";
import { useIsMobile } from "@/libs/hooks/use-mobile";
import { formatMoney } from "@/libs/utils/formatMoney";
import { maskAccountNumber } from "@/libs/utils/maskAccountNumber";

const isCredit = (record: ISourcesOfMoneyData) => record.type === SourcesOfMoneyType.CREDIT_CARD;

/** "Ngân hàng · Techcombank ••••0345" */
function describeSource(record: ISourcesOfMoneyData) {
    const parts = [SOURCES_OF_MONEY_TYPE_LABELS[record.type]];
    if (record.bankAccount) {
        parts.push(
            `${record.bankAccount.bankName} ${maskAccountNumber(record.bankAccount.accountNumber)}`,
        );
    }
    return parts.join(" · ");
}

function BalanceCell({ record }: { record: ISourcesOfMoneyData }) {
    if (!isCredit(record)) {
        return <Money value={record.balance} mutedZero className="font-semibold" />;
    }
    const limit = record.creditDetails?.creditLimit ?? 0;
    const debt = record.creditDetails?.currentDebt ?? 0;
    const available = record.availableCreditLimit ?? Math.max(0, limit - debt);
    const usedPercent = limit ? Math.round((debt / limit) * 100) : 0;
    return (
        <div className="min-w-48 text-sm leading-5">
            <div className="flex items-baseline justify-between gap-3">
                {debt ? (
                    <span className="font-semibold">
                        Nợ <Money value={debt} kind="debt" />
                    </span>
                ) : (
                    <span className="font-medium text-muted-foreground">Không dư nợ</span>
                )}
                <span className="money-value text-xs text-muted-foreground">
                    còn {formatMoney(available)}
                </span>
            </div>
            <Progress
                percent={usedPercent}
                showInfo={false}
                size="small"
                strokeColor={usedPercent >= 90 ? "var(--debt)" : "var(--credit)"}
                railColor="var(--muted)"
                className="m-0"
            />
            <CardFeeDetails record={record} />
        </div>
    );
}

interface IGroupProps {
    title: string;
    items: ISourcesOfMoneyData[];
    /** Số nguồn 0 ₫ đang bị ẩn trong nhóm */
    hiddenCount?: number;
}

function SourceGroup({ title, items, hiddenCount = 0 }: IGroupProps) {
    const {
        isLoading,
        isReordering,
        canReorder,
        handleReorder,
        handleHideEmpty,
        openEditModal,
        openHistory,
        openQr,
        handleDelete,
        openRollover,
    } = useSourcesOfMoneyContext();
    const isMobile = useIsMobile();

    const columns: ColumnsType<ISourcesOfMoneyData> = useMemo(() => {
        const hasQr = (record: ISourcesOfMoneyData) =>
            record.type === SourcesOfMoneyType.BANK && Boolean(record.bankAccount);

        // Đáo hạn chỉ có nghĩa khi thẻ còn dư nợ
        const canRollover = (record: ISourcesOfMoneyData) =>
            isCredit(record) && (record.creditDetails?.currentDebt ?? 0) > 0;

        const menu = (record: ISourcesOfMoneyData) => ({
            items: [
                ...(isMobile
                    ? [
                          { key: "history", label: "Lịch sử giao dịch" },
                          ...(hasQr(record) ? [{ key: "qr", label: "Mã QR nhận tiền" }] : []),
                      ]
                    : []),
                ...(canRollover(record) ? [{ key: "rollover", label: "Đáo hạn thẻ" }] : []),
                { key: "edit", label: "Sửa" },
                { key: "delete", label: "Xóa", danger: true },
            ],
            onClick: ({ key }: { key: string }) => {
                if (key === "history") openHistory(record);
                else if (key === "qr") openQr(record);
                else if (key === "rollover") openRollover(record._id);
                else if (key === "edit") openEditModal(record);
                else handleDelete(record);
            },
        });

        const nameCell = (record: ISourcesOfMoneyData) => (
            <div className="min-w-0 leading-5">
                <div className="truncate font-medium">{record.name}</div>
                <div className="truncate text-xs text-muted-foreground">{describeSource(record)}</div>
            </div>
        );

        const actions = (record: ISourcesOfMoneyData) => (
            <div className="flex items-center justify-end gap-1">
                {!isMobile && hasQr(record) ? (
                    <Button size="small" icon={<QrCode className="size-3.5" />} onClick={() => openQr(record)}>
                        QR
                    </Button>
                ) : null}
                {!isMobile ? (
                    <Button
                        size="small"
                        icon={<History className="size-3.5" />}
                        onClick={() => openHistory(record)}
                    >
                        Lịch sử
                    </Button>
                ) : null}
                <Dropdown trigger={["click"]} placement="bottomRight" menu={menu(record)}>
                    <Button
                        type="text"
                        size={isMobile ? "middle" : "small"}
                        aria-label="Thao tác"
                        className={isMobile ? "size-10" : undefined}
                        icon={<MoreHorizontal className="size-4" />}
                    />
                </Dropdown>
            </div>
        );

        if (isMobile) {
            return [
                {
                    title: "Nguồn tiền",
                    key: "source",
                    render: (_value, record) => (
                        <div className="flex flex-col gap-1.5">
                            {nameCell(record)}
                            <BalanceCell record={record} />
                        </div>
                    ),
                },
                { title: "", key: "actions", width: 52, render: (_value, record) => actions(record) },
            ];
        }

        return [
            { title: "Tên", key: "name", width: "34%", render: (_value, record) => nameCell(record) },
            {
                title: "Số dư / Hạn mức",
                key: "balance",
                render: (_value, record) => <BalanceCell record={record} />,
            },
            { title: "", key: "actions", width: 200, render: (_value, record) => actions(record) },
        ];
    }, [isMobile, openEditModal, openHistory, openQr, handleDelete, openRollover]);

    if (!isLoading && items.length === 0 && hiddenCount === 0) return null;

    return (
        <section className="flex flex-col gap-2">
            <h2 className="flex items-baseline gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {title}
                <span className="font-normal normal-case">· {items.length}</span>
            </h2>
            <div className="overflow-hidden rounded-xl border border-border bg-card">
                <SortableTable<ISourcesOfMoneyData>
                    items={items}
                    columns={columns}
                    size={isMobile ? "small" : "middle"}
                    loading={isLoading || isReordering}
                    onReorder={handleReorder}
                    reorderDisabled={!canReorder}
                    showHeader={!isMobile}
                />
                {hiddenCount > 0 ? (
                    <div className="border-t border-dashed border-border px-4 py-2.5 text-sm text-muted-foreground">
                        {hiddenCount} nguồn đang 0 ₫ đã ẩn ·{" "}
                        <button
                            type="button"
                            className="cursor-pointer font-medium text-accent-text hover:underline"
                            onClick={() => handleHideEmpty(false)}
                        >
                            Hiện
                        </button>
                    </div>
                ) : null}
            </div>
        </section>
    );
}

/** Nguồn tiền chia 2 nhóm: tiền (ngân hàng, ví, tiền mặt, khác) và thẻ tín dụng / trả sau. */
export default function SourcesOfMoneyTable() {
    const { items, hiddenCount } = useSourcesOfMoneyContext();
    const cashItems = items.filter((item) => !isCredit(item));
    const creditItems = items.filter(isCredit);

    return (
        <div className="flex flex-col gap-5">
            <SourceGroup
                title="Ngân hàng, ví & tiền mặt"
                items={cashItems}
                hiddenCount={hiddenCount}
            />
            <SourceGroup title="Thẻ tín dụng & trả sau" items={creditItems} />
        </div>
    );
}
