"use client";

import Money from "@/components/common/money";
import { useSourcesOfMoneyContext } from "@/components/features/sources-of-money/context";
import { cn } from "@/libs/shadcn/utils";

/** Tổng tiền mặt / dư nợ thẻ / tín dụng khả dụng trên toàn bộ nguồn (không theo bộ lọc). */
export default function SourcesSummary() {
    const { assets } = useSourcesOfMoneyContext();
    const totalDebt = assets.cashTotal - assets.netWorth;

    const cells = [
        { label: "Tiền mặt", node: <Money value={assets.cashTotal} /> },
        { label: "Dư nợ thẻ", node: <Money value={totalDebt} mutedZero /> },
        { label: "Tín dụng khả dụng", node: <Money value={assets.availableCreditTotal} /> },
    ];

    return (
        // Điện thoại xếp dọc: ba cột không đủ chỗ cho số tiền hàng trăm triệu, hàng tỷ
        <div className="grid overflow-hidden rounded-xl border border-border bg-card min-[480px]:grid-cols-3">
            {cells.map((cell, index) => (
                <div
                    key={cell.label}
                    className={cn(
                        "flex items-center justify-between gap-3 px-3 py-2 min-[480px]:block min-[480px]:py-3 sm:p-4",
                        index && "border-t border-border min-[480px]:border-t-0 min-[480px]:border-l",
                    )}
                >
                    <p className="text-xs text-muted-foreground">{cell.label}</p>
                    <div className="text-sm font-semibold sm:text-lg">{cell.node}</div>
                </div>
            ))}
        </div>
    );
}
