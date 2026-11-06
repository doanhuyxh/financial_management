"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/shadcn/ui/table";
import BankLabel from "@/components/features/deposit-rate-compare/components/bank-label";
import { formatRate, RANK_CLASS } from "@/components/features/deposit-rate-compare/components/rate-ranking";
import { useDepositRateCompareContext } from "@/components/features/deposit-rate-compare/context";
import { getRate, rankValues } from "@/components/features/deposit-rate-compare/utils";
import { cn } from "@/libs/shadcn/utils";

/** Bảng đầy đủ: mọi ngân hàng × mọi kỳ hạn (theo bậc của số tiền đang nhập); tô xanh/đỏ từng cột. */
export default function RateMatrix() {
    const { rows, availableTerms, scenario, handleScenarioChange } = useDepositRateCompareContext();
    if (availableTerms.length === 0) return null;

    const ranksByTerm = new Map(
        availableTerms.map((term) => [
            term,
            rankValues(rows.map((row) => ({ id: row.table._id, value: getRate(row.table, scenario.amount, term) }))),
        ]),
    );

    return (
        <section className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
            <div>
                <h2 className="text-base font-semibold">Bảng lãi suất theo kỳ hạn</h2>
                <p className="text-xs text-muted-foreground">%/năm, áp dụng cho số tiền đang nhập. Bấm tên kỳ hạn để chọn.</p>
            </div>
            <div className="overflow-x-auto">
                <Table className="w-max min-w-full">
                    <TableHeader>
                        <TableRow>
                            <TableHead className="sticky left-0 z-10 min-w-44 bg-card">Ngân hàng</TableHead>
                            {availableTerms.map((term) => (
                                <TableHead key={term} className="text-right">
                                    <button
                                        type="button"
                                        className={cn(
                                            "rounded px-1 hover:text-foreground",
                                            term === scenario.termMonths && "font-semibold text-primary",
                                        )}
                                        onClick={() => handleScenarioChange({ termMonths: term })}
                                    >
                                        {term}T
                                    </button>
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.map((row) => (
                            <TableRow key={row.table._id}>
                                <TableCell className="sticky left-0 z-10 max-w-52 bg-card">
                                    <BankLabel table={row.table} />
                                </TableCell>
                                {availableTerms.map((term) => {
                                    const rate = getRate(row.table, scenario.amount, term);
                                    const rank = ranksByTerm.get(term)?.get(row.table._id);
                                    return (
                                        <TableCell
                                            key={term}
                                            className={cn(
                                                "text-right tabular-nums",
                                                rate == null && "text-muted-foreground",
                                                rank && RANK_CLASS[rank],
                                                term === scenario.termMonths && "font-semibold",
                                            )}
                                        >
                                            {rate == null ? "—" : formatRate(rate)}
                                        </TableCell>
                                    );
                                })}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </section>
    );
}
