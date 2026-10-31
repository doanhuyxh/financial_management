"use client";

import { Banknote, CalendarClock, Globe, ShoppingBag } from "lucide-react";
import { useCreditCardCompareContext } from "@/components/features/credit-card-compare/context";
import { formatMoney } from "@/libs/utils/formatMoney";

const ICONS: Record<string, React.ReactNode> = {
    daily: <ShoppingBag className="size-4" />,
    debt: <CalendarClock className="size-4" />,
    cash: <Banknote className="size-4" />,
    foreign: <Globe className="size-4" />,
};

/** Thẻ nên dùng cho từng nhu cầu, theo chi phí thấp nhất trong kịch bản. */
export default function BestPicks() {
    const { bestPicks } = useCreditCardCompareContext();

    return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {bestPicks.map((item) => (
                <div
                    key={item.key}
                    className="flex flex-col gap-1 rounded-xl border border-border bg-background p-4"
                >
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                        {ICONS[item.key]}
                        {item.title}
                    </span>
                    {item.card ? (
                        <>
                            <span className="text-lg font-semibold">{item.card.name}</span>
                            <span className="text-sm text-green-600 dark:text-green-400">
                                {item.value ? `~${formatMoney(item.value)}` : "Miễn phí"}
                            </span>
                        </>
                    ) : (
                        <span className="text-sm text-muted-foreground">
                            Chưa thẻ nào nhập đủ thông tin
                        </span>
                    )}
                    <span className="text-xs text-muted-foreground">{item.description}</span>
                </div>
            ))}
        </div>
    );
}
