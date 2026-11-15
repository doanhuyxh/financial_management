"use client";

import Money from "@/components/common/money";
import BankLabel from "@/components/features/deposit-rate-compare/components/bank-label";
import { useDepositRateCompareContext } from "@/components/features/deposit-rate-compare/context";
import { formatRate } from "@/components/features/deposit-rate-compare/utils";
import { formatMoney } from "@/libs/utils/formatMoney";
import { cn } from "@/libs/shadcn/utils";

/** Tiền lãi của mọi lựa chọn ở kỳ hạn đang chọn, dạng thanh ngang (dài hơn = nhiều lãi hơn). */
export default function RateBars() {
    const { rows, scenario } = useDepositRateCompareContext();
    const rated = rows.filter((row) => row.interest != null);
    const missing = [...new Set(rows.filter((row) => row.rate == null).map((row) => row.option.bankName))];
    const max = Math.max(1, ...rated.map((row) => row.interest ?? 0));

    if (rated.length === 0) return null;

    return (
        <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
            <div>
                <h2 className="text-base font-semibold">
                    Tiền lãi nhận được ·{" "}
                    <span className="money-value">{formatMoney(scenario.amount)}</span> · {scenario.termMonths} tháng
                </h2>
                <p className="text-xs text-muted-foreground">
                    Thanh dài hơn = nhận nhiều lãi hơn · theo lãi suất niêm yết
                </p>
            </div>
            <ul className="flex flex-col gap-3">
                {rated.map((row, index) => (
                    <li
                        key={row.option.id}
                        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_9rem]"
                    >
                        <BankLabel item={row.option} />
                        <div className="order-last col-span-2 h-5 overflow-hidden rounded-md bg-muted sm:order-none sm:col-span-1">
                            <div
                                className={cn(
                                    "h-full rounded-md",
                                    index === 0 ? "bg-money-in" : "bg-muted-foreground/45",
                                )}
                                style={{ width: `${Math.max(2, ((row.interest ?? 0) / max) * 100)}%` }}
                            />
                        </div>
                        <div className="flex flex-col items-end">
                            <Money
                                value={row.interest}
                                kind={index === 0 ? "in" : "neutral"}
                                signed
                                className="font-semibold"
                            />
                            <span className="text-xs text-muted-foreground">{formatRate(row.rate ?? 0)}/năm</span>
                        </div>
                    </li>
                ))}
            </ul>
            {missing.length > 0 ? (
                <p className="text-xs text-muted-foreground">
                    Không có kỳ hạn {scenario.termMonths} tháng: {missing.join(", ")}.
                </p>
            ) : null}
        </section>
    );
}
