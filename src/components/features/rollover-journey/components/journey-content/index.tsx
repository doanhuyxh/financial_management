"use client";

import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/shadcn/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/shadcn/ui/empty";
import ParagraphSkeleton from "@/components/common/paragraph-skeleton";
import { useRolloverJourneyContext } from "@/components/features/rollover-journey/context";
import JourneyHeader from "@/components/features/rollover-journey/components/journey-header";
import JourneyOverview from "@/components/features/rollover-journey/components/journey-overview";
import JourneyTimeline from "@/components/features/rollover-journey/components/journey-timeline";
import JourneySidePanels from "@/components/features/rollover-journey/components/journey-side-panels";
import JourneysTable from "@/components/features/rollover-journey/components/journeys-table";
import { MENU_KEY } from "@/libs/constants/menuKey";

/** Bố cục trang: header → tổng quan → (dòng thời gian | cột phải) → danh sách hành trình. */
export default function JourneyContent() {
    const { cards, selectedCard, selectedJourney, computed, isLoading, isDetailLoading, openRollover } =
        useRolloverJourneyContext();

    if (isLoading) return <ParagraphSkeleton rows={6} />;

    if (cards.length === 0) {
        return (
            <Empty>
                <EmptyHeader>
                    <EmptyTitle>Chưa có thẻ tín dụng nào</EmptyTitle>
                    <EmptyDescription>
                        <Link href={MENU_KEY.SOURCES_OF_MONEY} className="text-accent-text underline">Thêm thẻ ở trang Nguồn tiền</Link>
                    </EmptyDescription>
                </EmptyHeader>
            </Empty>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <JourneyHeader />
            {!selectedJourney ? (
                <Empty className="rounded-xl border border-border bg-card">
                    <EmptyHeader>
                        <EmptyTitle>{selectedCard?.name ?? "Thẻ này"} chưa có hành trình đáo hạn</EmptyTitle>
                        <EmptyDescription>Ghi lần đáo hạn đầu tiên để bắt đầu theo dõi phí và dư nợ qua từng kỳ.</EmptyDescription>
                    </EmptyHeader>
                    <Button type="button" onClick={openRollover}>
                        <RefreshCw /> Ghi đáo hạn
                    </Button>
                </Empty>
            ) : isDetailLoading || !computed ? (
                <ParagraphSkeleton rows={6} />
            ) : (
                <>
                    <JourneyOverview />
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                        <JourneyTimeline />
                        <JourneySidePanels />
                    </div>
                </>
            )}
            <JourneysTable />
        </div>
    );
}
