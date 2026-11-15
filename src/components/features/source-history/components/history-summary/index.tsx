"use client";

import { useSourceHistoryContext } from "@/components/features/source-history/context";
import { cn } from "@/libs/shadcn/utils";
import { formatMoney } from "@/libs/utils/formatMoney";
import { getTrackedAmount } from "@/libs/utils/trackedAmount";

/** Dải số liệu: số dư/dư nợ hiện tại và tổng tăng/giảm, số giao dịch của bộ lọc đang chọn. */
export default function HistorySummary() {
    const { source, isCreditCard, summary, pagination } = useSourceHistoryContext();

    if (!source) return null;

    const cards = [
        {
            label: isCreditCard ? "Dư nợ hiện tại" : "Số dư hiện tại",
            value: formatMoney(getTrackedAmount(source)),
            className: "money-value",
        },
        {
            label: isCreditCard ? "Phát sinh nợ" : "Tiền vào",
            value: summary ? formatMoney(summary.increase) : "—",
            className: cn("money-value", isCreditCard ? "text-money-out" : "text-money-in"),
        },
        {
            label: isCreditCard ? "Giảm nợ" : "Tiền ra",
            value: summary ? formatMoney(summary.decrease) : "—",
            className: cn("money-value", isCreditCard ? "text-money-in" : "text-money-out"),
        },
        {
            label: "Số giao dịch",
            value: pagination ? pagination.total.toLocaleString("vi-VN") : "—",
            className: "",
        },
    ];

    return (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {cards.map((card) => (
                <div key={card.label} className="rounded-xl border border-border bg-card px-4 py-3">
                    <p className="text-xs text-muted-foreground">{card.label}</p>
                    <p className={cn("mt-0.5 text-lg font-semibold tabular-nums", card.className)}>
                        {card.value}
                    </p>
                </div>
            ))}
        </div>
    );
}
