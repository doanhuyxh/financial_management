"use client";

import CardRolloverModal from "@/components/common/card-rollover-modal";
import { useRolloverJourneyContext } from "@/components/features/rollover-journey/context";

export default function JourneyRolloverModal() {
    const {
        rolloverSource,
        closeRollover,
        handleRolloverSubmit,
        isRolloverSubmitting,
        rolloverItems,
        isRolloverLoading,
        handleDeleteRollover,
    } = useRolloverJourneyContext();
    return (
        <CardRolloverModal
            source={rolloverSource}
            onClose={closeRollover}
            onSubmit={handleRolloverSubmit}
            isSubmitting={isRolloverSubmitting}
            items={rolloverItems}
            isLoading={isRolloverLoading}
            onDelete={handleDeleteRollover}
        />
    );
}
