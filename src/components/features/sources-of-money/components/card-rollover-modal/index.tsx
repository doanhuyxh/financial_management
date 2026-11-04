"use client";

import CardRolloverModal from "@/components/common/card-rollover-modal";
import { useSourcesOfMoneyContext } from "@/components/features/sources-of-money/context";

/** Modal đáo hạn mở từ menu "⋯" → "Đáo hạn thẻ" của thẻ còn dư nợ. */
export default function SourcesCardRolloverModal() {
    const {
        rolloverSource,
        closeRollover,
        handleRolloverSubmit,
        isRolloverSubmitting,
        rolloverItems,
        isRolloverLoading,
        handleDeleteRollover,
    } = useSourcesOfMoneyContext();

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
