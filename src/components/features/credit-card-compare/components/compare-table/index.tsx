"use client";

import type { ReactNode } from "react";
import { Table, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import { Info } from "lucide-react";
import { useCreditCardCompareContext } from "@/components/features/credit-card-compare/context";
import {
    COMPARE_CRITERIA,
    rankCriterion,
    type ICardMetrics,
    type ICompareCriterion,
    type IYearlyFee,
    type RankResult,
} from "@/components/features/credit-card-compare/utils";
import { formatMoney } from "@/libs/utils/formatMoney";

const RANK_CLASS: Record<NonNullable<RankResult>, string> = {
    best: "bg-green-500/10 text-green-700 dark:text-green-400",
    worst: "bg-red-500/10 text-red-700 dark:text-red-400",
};

function Missing() {
    return <span className="text-muted-foreground">Chưa nhập</span>;
}

function Sub({ children }: { children: ReactNode }) {
    return <div className="text-xs text-muted-foreground">{children}</div>;
}

function YearlyFeeCell({ fee }: { fee: IYearlyFee }) {
    return (
        <>
            <div>{fee.waived ? "Được miễn" : formatMoney(fee.amount)}</div>
            {fee.condition ? <Sub>{fee.condition}</Sub> : null}
        </>
    );
}

function renderCell(key: string, m: ICardMetrics): ReactNode {
    switch (key) {
        case "available":
            return (
                <>
                    <div>{formatMoney(m.available)}</div>
                    <Sub>Hạn mức {formatMoney(m.creditLimit)}</Sub>
                </>
            );
        case "fixedYear":
            return <div className="font-semibold">{formatMoney(m.fixedYear)}</div>;
        case "annualFee":
            return <YearlyFeeCell fee={m.annualFee} />;
        case "managementFee":
            return <YearlyFeeCell fee={m.managementFee} />;
        case "paymentFee":
            return formatMoney(m.paymentFeeYear);
        case "usageFee":
            return formatMoney(m.usageFeeYear);
        case "interest":
            return m.interestCost != null ? (
                <>
                    <div>{formatMoney(m.interestCost)}</div>
                    <Sub>{m.interestRate}%/năm</Sub>
                </>
            ) : (
                <Missing />
            );
        case "cashAdvance":
            return m.cashAdvanceTotal != null ? (
                <>
                    <div>{formatMoney(m.cashAdvanceTotal)}</div>
                    <Sub>
                        Phí {formatMoney(m.cashAdvanceFee)}
                        {m.cashAdvanceInterest != null
                            ? ` + lãi ${formatMoney(m.cashAdvanceInterest)}`
                            : " (chưa nhập lãi)"}
                    </Sub>
                </>
            ) : (
                <Missing />
            );
        case "foreignFx":
            return m.foreignFxFee != null ? formatMoney(m.foreignFxFee) : <Missing />;
        case "foreignVnd":
            return m.foreignVndFee != null ? formatMoney(m.foreignVndFee) : <Missing />;
        case "lateFee":
            return m.lateFeeMin != null ? formatMoney(m.lateFeeMin) : <Missing />;
        default:
            return null;
    }
}

type Row = ICompareCriterion & { ranks: Map<string, RankResult> };

/** Hàng = tiêu chí, cột = thẻ; ô xanh là thẻ tốt nhất, đỏ là tệ nhất của tiêu chí đó. */
export default function CompareTable() {
    const { cards } = useCreditCardCompareContext();

    const rows: Row[] = COMPARE_CRITERIA.map((criterion) => ({
        ...criterion,
        ranks: rankCriterion(criterion, cards),
    }));

    const columns: ColumnsType<Row> = [
        {
            title: "Tiêu chí",
            key: "label",
            fixed: "left",
            width: 170,
            render: (_, row) => (
                <span className="flex items-center gap-1 font-medium">
                    {row.label}
                    {row.hint ? (
                        <Tooltip title={row.hint}>
                            <Info className="size-3.5 text-muted-foreground" />
                        </Tooltip>
                    ) : null}
                </span>
            ),
        },
        ...cards.map((card) => ({
            title: card.name,
            key: card._id,
            width: 180,
            onCell: (row: Row) => {
                const rank = row.ranks.get(card._id);
                return { className: rank ? RANK_CLASS[rank] : undefined };
            },
            render: (_: unknown, row: Row) => renderCell(row.key, card),
        })),
    ];

    return (
        <div className="rounded-xl border border-border bg-background p-4">
            <div className="mb-3">
                <h2 className="text-base font-semibold">Bảng so sánh</h2>
                <p className="text-xs text-muted-foreground">
                    <span className="text-green-600 dark:text-green-400">Xanh</span>: tốt nhất ·{" "}
                    <span className="text-red-600 dark:text-red-400">Đỏ</span>: tệ nhất. Ô
                    &quot;Chưa nhập&quot; không được xếp hạng. Phí thường niên/quản lý/thanh toán
                    bỏ trống được coi là không có phí.
                </p>
            </div>
            <Table<Row>
                rowKey="key"
                size="small"
                columns={columns}
                dataSource={rows}
                pagination={false}
                scroll={{ x: "max-content" }}
            />
        </div>
    );
}
