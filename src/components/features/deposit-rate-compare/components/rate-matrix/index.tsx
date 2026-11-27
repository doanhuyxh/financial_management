"use client";

import { useState } from "react";
import Money from "@/components/common/money";
import Segmented from "@/components/common/segmented";
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
import { calcDepositInterest, formatRate, rankValues } from "@/components/features/deposit-rate-compare/utils";
import { cn } from "@/libs/shadcn/utils";

type MatrixUnit = "rate" | "money";

/**
 * Bảng đầy đủ: mọi lựa chọn × mọi kỳ hạn (theo bậc của số tiền đang nhập).
 * Chỉ tô xanh ô cao nhất mỗi kỳ hạn; cột kỳ hạn đang chọn nền màu nhạt. Đổi xem %/năm hoặc tiền lãi.
 */
export default function RateMatrix() {
    const { rows, availableTerms, scenario, handleScenarioChange } = useDepositRateCompareContext();
    const [unit, setUnit] = useState<MatrixUnit>("rate");
    if (availableTerms.length === 0) return null;

    const ranksByTerm = new Map(
        availableTerms.map((term) => [
            term,
            rankValues(rows.map((row) => ({ id: row.option.id, value: row.option.rates.get(term) ?? null }))),
        ]),
    );

    return (
        <section className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="text-base font-semibold">Bảng chi tiết</h2>
                    <p className="text-xs text-muted-foreground">
                        Tô xanh ô cao nhất mỗi kỳ hạn · cột nền xanh là kỳ hạn đang chọn · bấm tên kỳ hạn để chọn
                    </p>
                </div>
                <Segmented<MatrixUnit>
                    variant="primary"
                    size="small"
                    aria-label="Đơn vị hiển thị"
                    value={unit}
                    onChange={setUnit}
                    options={[
                        { value: "rate", label: "%/năm" },
                        { value: "money", label: "Tiền lãi" },
                    ]}
                />
            </div>
            <div className="overflow-x-auto">
                <Table className="w-max min-w-full">
                    <TableHeader>
                        <TableRow>
                            <TableHead className="sticky left-0 z-10 min-w-44 bg-card">Ngân hàng</TableHead>
                            {availableTerms.map((term) => (
                                <TableHead
                                    key={term}
                                    className={cn("text-right", term === scenario.termMonths && "bg-primary-soft")}
                                >
                                    <button
                                        type="button"
                                        className={cn(
                                            "rounded px-1 hover:text-foreground",
                                            term === scenario.termMonths && "font-bold text-accent-text",
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
                            <TableRow key={row.option.id}>
                                <TableCell className="sticky left-0 z-10 max-w-60 bg-card">
                                    <BankLabel item={row.option} />
                                </TableCell>
                                {availableTerms.map((term) => {
                                    const rate = row.option.rates.get(term) ?? null;
                                    const isBest = ranksByTerm.get(term)?.get(row.option.id) === "best";
                                    const onlyIn = row.option.onlyIn.get(term);
                                    return (
                                        <TableCell
                                            key={term}
                                            className={cn(
                                                "text-right tabular-nums",
                                                term === scenario.termMonths && "bg-primary-soft/60",
                                                rate == null && "text-muted-foreground/50",
                                                isBest && "bg-money-in-soft font-semibold text-money-in",
                                            )}
                                        >
                                            {rate == null ? (
                                                "—"
                                            ) : unit === "rate" ? (
                                                formatRate(rate)
                                            ) : (
                                                <Money
                                                    value={calcDepositInterest(scenario.amount, rate, term)}
                                                    className={isBest ? "text-money-in" : undefined}
                                                />
                                            )}
                                            {onlyIn ? (
                                                <span className="block text-[10px] font-normal text-muted-foreground">
                                                    chỉ {onlyIn}
                                                </span>
                                            ) : null}
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
