"use client";

import RolloverJourneyContextProvider from "@/components/features/rollover-journey/context";
import JourneyContent from "@/components/features/rollover-journey/components/journey-content";
import JourneyRolloverModal from "@/components/features/rollover-journey/components/journey-rollover-modal";
import EndJourneyModal from "@/components/features/rollover-journey/components/end-journey-modal";
import BaseAmountModal from "@/components/features/rollover-journey/components/base-amount-modal";

/** Trang Hành trình đáo hạn: chọn thẻ, số liệu, biểu đồ, dòng thời gian, danh sách hành trình. */
export default function RolloverJourneyComponent() {
    return (
        <RolloverJourneyContextProvider>
            <JourneyContent />
            <JourneyRolloverModal />
            <EndJourneyModal />
            <BaseAmountModal />
        </RolloverJourneyContextProvider>
    );
}
