"use client";

import { Trophy } from "lucide-react";
import Money from "@/components/common/money";
import BankLabel from "@/components/features/deposit-rate-compare/components/bank-label";
import { useDepositRateCompareContext } from "@/components/features/deposit-rate-compare/context";

const percent = (value: number) => `${value.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}%`;

/** Ngân hàng lãi cao nhất cho kỳ hạn đang chọn, và chênh lệch so với thấp nhất. */
export default function BestPick() {
    const { rows, scenario } = useDepositRateCompareContext();
    const rated = rows.filter((row) => row.interest != null);
    if (rated.length === 0) {
        return (
            <section className="rounded-xl border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">
                Chưa có ngân hàng nào niêm yết kỳ hạn {scenario.termMonths} tháng. Chọn kỳ hạn khác hoặc tự
                nhập lãi suất.
            </section>
        );
    }
    const best = rated[0];
    const worst = rated[rated.length - 1];
    const gap = (best.interest ?? 0) - (worst.interest ?? 0);

    return (
        <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-col gap-2">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Trophy className="size-4" />
                    Lãi cao nhất kỳ hạn {scenario.termMonths} tháng
                </span>
                <BankLabel table={best.table} />
            </div>
            <div className="flex flex-col gap-0.5 sm:items-end">
                <span className="text-2xl font-bold tabular-nums">{percent(best.rate ?? 0)}/năm</span>
                <span className="text-sm">
                    Tiền lãi <Money value={best.interest} kind="in" className="font-semibold" />
                </span>
                {rated.length > 1 && gap > 0 ? (
                    <span className="text-xs text-muted-foreground">
                        Hơn {worst.table.bankName} <Money value={gap} kind="in" />
                    </span>
                ) : null}
            </div>
        </section>
    );
}
