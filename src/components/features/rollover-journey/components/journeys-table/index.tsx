"use client";

import dayjs from "dayjs";
import Money from "@/components/common/money";
import { useRolloverJourneyContext } from "@/components/features/rollover-journey/context";
import {
    ROLLOVER_JOURNEY_END_REASON_LABELS,
    RolloverJourneyEndReason,
} from "@/libs/interfaces/rolloverJourneysData";
import { cn } from "@/libs/shadcn/utils";

/** Danh sách mọi hành trình của mọi thẻ; bấm một dòng để xem. */
export default function JourneysTable() {
    const { journeys, selectedJourney, handleSelectCard, handleSelectJourney } = useRolloverJourneyContext();
    if (journeys.length === 0) return null;

    return (
        <section className="rounded-xl border border-border bg-card p-4">
            <p className="mb-2 font-semibold">Danh sách hành trình</p>
            <div className="overflow-x-auto">
                <table className="w-full text-xs">
                    <thead className="text-muted-foreground">
                        <tr>
                            <th className="py-1 text-left font-medium">Thẻ</th>
                            <th className="py-1 text-left font-medium">Bắt đầu</th>
                            <th className="py-1 text-right font-medium">Kỳ</th>
                            <th className="py-1 text-right font-medium">Gốc</th>
                            <th className="py-1 text-right font-medium">Phí</th>
                            <th className="py-1 text-right font-medium">% gốc</th>
                            <th className="py-1 text-right font-medium">Trạng thái</th>
                        </tr>
                    </thead>
                    <tbody className="tabular-nums">
                        {journeys.map((journey) => {
                            const source = typeof journey.sourceOfMoneyId === "string" ? null : journey.sourceOfMoneyId;
                            const isOpen = !journey.endedAt;
                            const selected = selectedJourney?._id === journey._id;
                            return (
                                <tr
                                    key={journey._id}
                                    className={cn("cursor-pointer border-t border-border hover:bg-muted/60", selected && "bg-primary-soft")}
                                    onClick={() => {
                                        if (source) handleSelectCard(source._id);
                                        handleSelectJourney(journey._id);
                                    }}
                                >
                                    <td className="py-1.5">{source?.name ?? "—"}</td>
                                    <td className="py-1.5">{dayjs(journey.startedAt).format("DD/MM/YYYY")}</td>
                                    <td className="py-1.5 text-right">{journey.stats.rolloverCount}</td>
                                    <td className="py-1.5 text-right"><Money value={journey.baseAmount} /></td>
                                    <td className="py-1.5 text-right"><Money value={journey.stats.totalFee} kind="out" /></td>
                                    <td className="py-1.5 text-right">{journey.baseAmount > 0 ? `${((journey.stats.totalFee / journey.baseAmount) * 100).toFixed(1)}%` : "—"}</td>
                                    <td className="py-1.5 text-right">
                                        <span
                                            className={cn(
                                                "rounded-full px-2 py-px font-medium",
                                                isOpen
                                                    ? "bg-warn-soft text-warn"
                                                    : journey.endReason === RolloverJourneyEndReason.PAID_OFF
                                                      ? "bg-money-in-soft text-money-in"
                                                      : "bg-credit-soft text-credit",
                                            )}
                                        >
                                            {isOpen ? "Đang đáo" : ROLLOVER_JOURNEY_END_REASON_LABELS[journey.endReason ?? RolloverJourneyEndReason.OTHER]}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
