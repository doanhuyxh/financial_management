"use client";

import Money from "@/components/common/money";
import { useSourcesOfMoneyContext } from "@/components/features/sources-of-money/context";

/** Tổng tiền mặt / dư nợ thẻ / tín dụng khả dụng trên toàn bộ nguồn (không theo bộ lọc). */
export default function SourcesSummary() {
    const { assets } = useSourcesOfMoneyContext();
    const totalDebt = assets.cashTotal - assets.netWorth;

    const cells = [
        { label: "Tiền mặt", node: <Money value={assets.cashTotal} /> },
        { label: "Dư nợ thẻ", node: <Money value={totalDebt} kind="debt" mutedZero /> },
        { label: "Tín dụng khả dụng", node: <Money value={assets.availableCreditTotal} kind="credit" /> },
    ];

    return (
        <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-border bg-card">
            {cells.map((cell, index) => (
                <div
                    key={cell.label}
                    className={index ? "border-l border-border p-3 sm:p-4" : "p-3 sm:p-4"}
                >
                    <p className="text-xs text-muted-foreground">{cell.label}</p>
                    <div className="text-sm font-semibold sm:text-lg">{cell.node}</div>
                </div>
            ))}
        </div>
    );
}
