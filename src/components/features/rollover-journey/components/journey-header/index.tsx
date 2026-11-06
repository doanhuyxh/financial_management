"use client";

import dayjs from "dayjs";
import { ChartLine, Flag, RefreshCw } from "lucide-react";
import ChoiceChips from "@/components/common/choice-chips";
import Combobox from "@/components/common/combobox";
import { Button } from "@/components/shadcn/ui/button";
import { useRolloverJourneyContext } from "@/components/features/rollover-journey/context";
import { ROLLOVER_JOURNEY_END_REASON_LABELS } from "@/libs/interfaces/rolloverJourneysData";
import { cn } from "@/libs/shadcn/utils";

/** Chọn thẻ / hành trình, trạng thái, công tắc dự kiến và các nút hành động. */
export default function JourneyHeader() {
    const {
        cards,
        selectedCard,
        cardJourneys,
        selectedJourney,
        computed,
        view,
        setView,
        handleSelectCard,
        handleSelectJourney,
        openRollover,
        openEndModal,
    } = useRolloverJourneyContext();

    const isOpen = selectedJourney ? !selectedJourney.endedAt : false;
    const statusLabel = !selectedJourney
        ? "Chưa có hành trình"
        : isOpen
          ? `Đang đáo hạn · kỳ ${computed?.count ?? selectedJourney.stats.rolloverCount}`
          : (ROLLOVER_JOURNEY_END_REASON_LABELS[selectedJourney.endReason ?? "OTHER"] ?? "Đã kết thúc");
    const statusClass = !selectedJourney
        ? "bg-muted text-muted-foreground"
        : isOpen
          ? "bg-warn-soft text-warn"
          : selectedJourney.endReason === "PAID_OFF"
            ? "bg-money-in-soft text-money-in"
            : "bg-credit-soft text-credit";

    return (
        <section className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                    <Combobox
                        className="w-auto max-w-full min-w-48"
                        value={selectedCard?._id}
                        onChange={(value) => {
                            if (value) handleSelectCard(value);
                        }}
                        options={cards.map((card) => ({ value: card._id, label: card.name }))}
                        placeholder="Chọn thẻ"
                        aria-label="Chọn thẻ"
                    />
                    {cardJourneys.length > 1 ? (
                        <Combobox
                            className="w-auto max-w-full min-w-44"
                            value={selectedJourney?._id}
                            onChange={(value) => {
                                if (value) handleSelectJourney(value);
                            }}
                            options={cardJourneys.map((journey) => ({
                                value: journey._id,
                                label: `${dayjs(journey.startedAt).format("MM/YYYY")}${journey.endedAt ? ` → ${dayjs(journey.endedAt).format("MM/YYYY")}` : " → nay"}`,
                            }))}
                            aria-label="Chọn hành trình"
                        />
                    ) : null}
                    <span className={cn("rounded-full px-2 py-px text-xs font-medium", statusClass)}>{statusLabel}</span>
                    {selectedJourney ? (
                        <span className="text-xs text-muted-foreground">
                            Bắt đầu {dayjs(selectedJourney.startedAt).format("DD/MM/YYYY")} ·{" "}
                            {dayjs(selectedJourney.endedAt ?? undefined).diff(dayjs(selectedJourney.startedAt), "month")} tháng
                        </span>
                    ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {isOpen ? (
                        <ChoiceChips
                            options={[
                                { value: "all", label: "Thực tế + dự kiến" },
                                { value: "real", label: "Chỉ thực tế" },
                            ]}
                            value={view}
                            onChange={(value) => setView(value as typeof view)}
                        />
                    ) : null}
                    {selectedCard ? (
                        <Button type="button" variant="outline" size="sm" onClick={openRollover}>
                            <RefreshCw /> Ghi đáo hạn
                        </Button>
                    ) : null}
                    {selectedCard ? (
                        <Button type="button" variant="outline" size="sm" onClick={openRollover} title="Mở tab Phân tích trong modal đáo hạn">
                            <ChartLine /> Mô phỏng
                        </Button>
                    ) : null}
                    {isOpen ? (
                        <Button type="button" variant="outline" size="sm" onClick={openEndModal}>
                            <Flag /> Kết thúc hành trình
                        </Button>
                    ) : null}
                </div>
            </div>
        </section>
    );
}
