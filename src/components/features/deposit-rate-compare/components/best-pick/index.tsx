"use client";

import Money from "@/components/common/money";
import BankLabel from "@/components/features/deposit-rate-compare/components/bank-label";
import { useDepositRateCompareContext } from "@/components/features/deposit-rate-compare/context";
import { formatRate } from "@/components/features/deposit-rate-compare/utils";
import { cn } from "@/libs/shadcn/utils";

const RANK_LABELS = ["Cao nhất", "Thứ 2", "Thứ 3"];

/** Câu trả lời cho số tiền + kỳ hạn đang chọn, và 3 lựa chọn lãi cao nhất. */
export default function BestPick() {
    const { rows, scenario } = useDepositRateCompareContext();
    const rated = rows.filter((row) => row.rate != null && row.interest != null);

    if (rated.length === 0) {
        return (
            <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
                Chưa có ngân hàng nào niêm yết kỳ hạn {scenario.termMonths} tháng. Chọn kỳ hạn khác hoặc tự nhập
                lãi suất.
            </p>
        );
    }

    const best = rated[0];
    const worst = rated[rated.length - 1];
    const gap = (best.interest ?? 0) - (worst.interest ?? 0);
    const worstNames = [
        ...new Set(rated.filter((row) => row.rate === worst.rate).map((row) => row.option.bankName)),
    ].join(", ");

    return (
        <div className="flex flex-col gap-3">
            <p className="rounded-lg border border-money-in/30 bg-money-in-soft px-4 py-3 text-sm sm:text-base">
                Gửi <Money value={scenario.amount} className="font-semibold" /> kỳ hạn{" "}
                <b>{scenario.termMonths} tháng</b>: <b>{best.option.bankName}</b> cho nhiều lãi nhất,{" "}
                <Money value={best.interest} kind="in" className="font-bold" />
                {gap > 0 ? (
                    <>
                        , hơn chỗ thấp nhất ({worstNames}) <Money value={gap} kind="in" className="font-bold" />.
                    </>
                ) : rated.length > 1 ? (
                    ". Các ngân hàng có kỳ hạn này đang cùng lãi suất."
                ) : (
                    "."
                )}
            </p>
            <div className="grid gap-3 md:grid-cols-3">
                {rated.slice(0, 3).map((row, index) => {
                    const isFirst = index === 0;
                    const diff = isFirst
                        ? rated[1]
                            ? (row.interest ?? 0) - (rated[1].interest ?? 0)
                            : null
                        : (rated[0].interest ?? 0) - (row.interest ?? 0);
                    return (
                        <div
                            key={row.option.id}
                            className={cn(
                                "flex flex-col gap-2 rounded-xl border border-border bg-background p-4",
                                isFirst && "border-money-in/50 bg-linear-to-b from-money-in-soft to-transparent",
                            )}
                        >
                            <span
                                className={cn(
                                    "text-[11px] font-semibold tracking-wide uppercase",
                                    isFirst ? "text-money-in" : "text-muted-foreground",
                                )}
                            >
                                {RANK_LABELS[index]}
                            </span>
                            <BankLabel item={row.option} />
                            <Money value={row.interest} kind="in" signed className="text-2xl font-semibold" />
                            <span className="text-xs text-muted-foreground">
                                {formatRate(row.rate ?? 0)}/năm · nhận cuối kỳ{" "}
                                <Money value={scenario.amount + (row.interest ?? 0)} />
                            </span>
                            {diff != null ? (
                                <span className="self-start rounded-md bg-muted px-2 py-1 text-xs">
                                    {isFirst ? "Hơn thứ 2: " : "Kém số 1: "}
                                    <Money value={diff} kind={isFirst ? "in" : "neutral"} className="font-semibold" />
                                </span>
                            ) : null}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
