"use client";

import CardRolloverModal from "@/components/common/card-rollover-modal";
import { useDashboardContext } from "@/components/features/dashboard/context";

/** Modal đáo hạn mở từ nút "Đáo hạn" / "Cần chú ý" của dashboard. */
export default function DashboardCardRolloverModal() {
    const {
        rolloverSource,
        closeRollover,
        handleRolloverSubmit,
        isRolloverSubmitting,
        rolloverItems,
        isRolloverLoading,
        handleDeleteRollover,
    } = useDashboardContext();

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
