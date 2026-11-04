"use client";

import { useCallback, useState } from "react";
import {
    useCreateCardRollover,
    useDeleteCardRollover,
    useGetCardRollovers,
} from "@/libs/hooks/customHooks/useCardRollovers";
import { useAppFeedback } from "@/libs/hooks/useAppFeedback";
import type { ICardRolloverData, IFromCardRolloverData } from "@/libs/interfaces/cardRolloversData";

const RECENT_LIMIT = 5;

function getErrorMessage(error: unknown, fallback: string) {
    if (error && typeof error === "object" && "message" in error) {
        return String((error as { message?: string }).message) || fallback;
    }
    return fallback;
}

/**
 * State và handler của modal đáo hạn thẻ (`common/card-rollover-modal`), dùng chung cho
 * dashboard và trang Nguồn tiền. Caller tự tìm nguồn theo `rolloverCardId` để dư nợ luôn mới.
 */
export function useCardRollover() {
    const { notification, modal } = useAppFeedback();
    const [rolloverCardId, setRolloverCardId] = useState<string | null>(null);

    const { data, isLoading: isRolloverLoading } = useGetCardRollovers(
        { sourceOfMoneyId: rolloverCardId ?? undefined, page: 1, limit: RECENT_LIMIT },
        Boolean(rolloverCardId),
    );
    const { mutateAsync: createRollover, isPending: isRolloverSubmitting } =
        useCreateCardRollover();
    const { mutateAsync: deleteRollover } = useDeleteCardRollover();

    const openRollover = useCallback((cardId: string) => setRolloverCardId(cardId), []);
    const closeRollover = useCallback(() => setRolloverCardId(null), []);

    const handleRolloverSubmit = useCallback(
        async (values: IFromCardRolloverData) => {
            try {
                const res = await createRollover(values);
                notification.success({ title: res?.message || "Đã ghi đáo hạn thẻ" });
                closeRollover();
                return true;
            } catch (error: unknown) {
                notification.error({ title: getErrorMessage(error, "Ghi đáo hạn thất bại") });
                return false;
            }
        },
        [createRollover, notification, closeRollover],
    );

    const handleDeleteRollover = useCallback(
        (item: ICardRolloverData) => {
            modal.confirm({
                title: "Xóa lần đáo hạn này?",
                content: "Dư nợ thẻ sẽ giảm đúng phần phí đã ghi và khoản chi phí đáo hạn bị xóa.",
                okText: "Xóa",
                okType: "danger",
                onOk: async () => {
                    try {
                        await deleteRollover(item._id);
                        notification.success({ title: "Đã xóa lần đáo hạn" });
                    } catch (error: unknown) {
                        notification.error({
                            title: getErrorMessage(error, "Xóa đáo hạn thất bại"),
                        });
                    }
                },
            });
        },
        [deleteRollover, modal, notification],
    );

    return {
        rolloverCardId,
        openRollover,
        closeRollover,
        rolloverItems: data?.data?.items ?? [],
        isRolloverLoading,
        isRolloverSubmitting,
        handleRolloverSubmit,
        handleDeleteRollover,
    };
}

export type CardRolloverState = ReturnType<typeof useCardRollover>;
