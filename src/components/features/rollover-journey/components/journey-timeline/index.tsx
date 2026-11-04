"use client";

import { useRolloverJourneyContext } from "@/components/features/rollover-journey/context";
import type { JourneyEventKind } from "@/components/features/rollover-journey/utils";
import { cn } from "@/libs/shadcn/utils";
import { formatMoney } from "@/libs/utils/formatMoney";

const DOT_CLASS: Record<JourneyEventKind, string> = {
    start: "border-primary bg-primary",
    payment: "border-money-in bg-money-in",
    rollover: "border-warn bg-card",
    projected: "border-dashed border-muted-foreground bg-card",
    end: "border-money-in bg-money-in shadow-[0_0_0_4px_var(--money-in-soft)]",
    more: "border-border bg-card",
};

/** Dòng thời gian: bắt đầu, từng lần đáo (kèm mốc cảnh báo), khoản tự trả, dự kiến, kết thúc. */
export default function JourneyTimeline() {
    const { computed } = useRolloverJourneyContext();
    if (!computed) return null;

    return (
        <section className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">Dòng thời gian</span>
                <span className="text-xs text-muted-foreground">Mỗi lần đáo là một mốc; khoản tự trả và điểm cảnh báo cũng được ghi</span>
            </div>
            <ul className="relative ml-2 border-l-2 border-border pl-5">
                {computed.events.map((event) => (
                    <li key={event.key} className={cn("relative pb-4 last:pb-0", event.kind === "projected" || event.kind === "more" ? "opacity-60" : undefined)}>
                        <span className={cn("absolute top-1 -left-[27px] size-3 rounded-full border-2", DOT_CLASS[event.kind])} />
                        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 md:grid-cols-[5.5rem_1fr_auto]">
                            <span className="text-xs text-muted-foreground tabular-nums">{event.date ? event.date.format("DD/MM/YYYY") : "…"}</span>
                            <div className="min-w-0">
                                <p className={cn("text-sm font-semibold", event.kind === "payment" && "text-money-in", event.kind === "end" && "text-money-in")}>
                                    {event.title}
                                    {event.milestone ? (
                                        <span className="ml-2 rounded-full bg-debt-soft px-2 py-px text-xs font-medium text-debt">
                                            Phí vượt {Math.round(event.milestone * 100)}% gốc
                                        </span>
                                    ) : null}
                                </p>
                                {event.meta ? <p className="text-xs text-muted-foreground">{event.meta}</p> : null}
                            </div>
                            {event.debtAfter != null ? (
                                <div className="col-start-2 text-xs md:col-start-3 md:text-right">
                                    <span className="text-debt tabular-nums">nợ {event.kind === "projected" ? "≈" : ""}{formatMoney(event.debtAfter)}</span>
                                    {event.cumFee != null ? (
                                        <span className="block text-muted-foreground tabular-nums">phí tích lũy {formatMoney(event.cumFee)} · {((event.feeRatio ?? 0) * 100).toFixed(1)}%</span>
                                    ) : null}
                                </div>
                            ) : null}
                        </div>
                    </li>
                ))}
            </ul>
        </section>
    );
}
