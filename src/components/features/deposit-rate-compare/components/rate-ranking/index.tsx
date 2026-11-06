"use client";

import Money from "@/components/common/money";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/shadcn/ui/table";
import BankLabel from "@/components/features/deposit-rate-compare/components/bank-label";
import { useDepositRateCompareContext } from "@/components/features/deposit-rate-compare/context";
import type { RankResult } from "@/components/features/deposit-rate-compare/utils";
import { formatDate } from "@/libs/utils/formatDate";
import { cn } from "@/libs/shadcn/utils";

/** Giống bảng so sánh thẻ: tốt nhất xanh, kém nhất đỏ. */
export const RANK_CLASS: Record<RankResult, string> = {
    best: "bg-green-500/10 text-green-700 dark:text-green-400",
    worst: "bg-red-500/10 text-red-700 dark:text-red-400",
};

export const formatRate = (value: number) =>
    `${value.toLocaleString("vi-VN", { minimumFractionDigits: 1, maximumFractionDigits: 2 })}%`;

/** Xếp hạng ngân hàng theo số tiền + kỳ hạn đang chọn. */
export default function RateRanking() {
    const { rows, scenario } = useDepositRateCompareContext();

    return (
        <section className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
            <h2 className="text-base font-semibold">Xếp hạng kỳ hạn {scenario.termMonths} tháng</h2>
            <div className="overflow-x-auto">
                <Table className="min-w-[560px]">
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-8">#</TableHead>
                            <TableHead>Ngân hàng</TableHead>
                            <TableHead className="text-right">Lãi suất/năm</TableHead>
                            <TableHead className="text-right">Tiền lãi</TableHead>
                            <TableHead className="text-right">Nhận cuối kỳ</TableHead>
                            <TableHead className="text-right">Cập nhật</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.map((row, index) => (
                            <TableRow key={row.table._id}>
                                <TableCell className="text-muted-foreground">
                                    {row.rate != null ? index + 1 : ""}
                                </TableCell>
                                <TableCell className="max-w-56">
                                    <BankLabel table={row.table} />
                                </TableCell>
                                {row.rate == null ? (
                                    <TableCell colSpan={3} className="text-right text-xs text-muted-foreground">
                                        Không có kỳ hạn này
                                    </TableCell>
                                ) : (
                                    <>
                                        <TableCell
                                            className={cn(
                                                "text-right font-semibold tabular-nums",
                                                row.rank && RANK_CLASS[row.rank],
                                            )}
                                        >
                                            {formatRate(row.rate)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Money value={row.interest} kind="in" />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Money value={scenario.amount + (row.interest ?? 0)} />
                                        </TableCell>
                                    </>
                                )}
                                <TableCell className="text-right text-xs text-muted-foreground">
                                    {formatDate(row.table.updatedAt)}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </section>
    );
}
