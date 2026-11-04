"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MENU_KEY } from "@/libs/constants/menuKey";
import { useGetSourcesOfMoney } from "@/libs/hooks/customHooks/useSourcesOfMoney";
import {
    useEndRolloverJourney,
    useGetRolloverJourneyDetail,
    useGetRolloverJourneys,
    useUpdateRolloverJourney,
} from "@/libs/hooks/customHooks/useRolloverJourneys";
import { useCardRollover } from "@/libs/hooks/useCardRollover";
import { useAppFeedback } from "@/libs/hooks/useAppFeedback";
import type { IFromEndRolloverJourneyData } from "@/libs/interfaces/rolloverJourneysData";
import { SourcesOfMoneyType } from "@/libs/interfaces/sourcesOfMoneyData";
import { computeJourney, type JourneyView } from "@/components/features/rollover-journey/utils";
import type { IRolloverJourneyContextProps } from "./type";

const RolloverJourneyContext = createContext<IRolloverJourneyContextProps | undefined>(undefined);

const cardIdOf = (journey: { sourceOfMoneyId: string | { _id: string } }) =>
    typeof journey.sourceOfMoneyId === "string" ? journey.sourceOfMoneyId : journey.sourceOfMoneyId._id;

function getErrorMessage(error: unknown, fallback: string) {
    if (error && typeof error === "object" && "message" in error) {
        return String((error as { message?: string }).message) || fallback;
    }
    return fallback;
}

export default function RolloverJourneyContextProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const cardIdParam = searchParams.get("cardId");
    const { notification } = useAppFeedback();

    const { data: sourcesData, isLoading: isSourcesLoading } = useGetSourcesOfMoney({ page: 1, limit: 100 });
    const cards = useMemo(
        () => (sourcesData?.data?.items ?? []).filter((item) => item.type === SourcesOfMoneyType.CREDIT_CARD),
        [sourcesData],
    );
    const { data: journeysData, isLoading: isJourneysLoading } = useGetRolloverJourneys();
    const journeys = useMemo(() => journeysData?.data ?? [], [journeysData]);

    // Thẻ đang chọn: theo URL, không có thì thẻ có hành trình đang mở, rồi thẻ đầu tiên
    const selectedCard = useMemo(() => {
        if (cardIdParam) return cards.find((card) => card._id === cardIdParam) ?? null;
        const open = journeys.find((journey) => !journey.endedAt);
        return (open && cards.find((card) => card._id === cardIdOf(open))) ?? cards[0] ?? null;
    }, [cards, journeys, cardIdParam]);

    const cardJourneys = useMemo(
        () => (selectedCard ? journeys.filter((journey) => cardIdOf(journey) === selectedCard._id) : []),
        [journeys, selectedCard],
    );
    const [journeyId, setJourneyId] = useState<string | null>(null);
    const selectedJourney = useMemo(
        () => cardJourneys.find((journey) => journey._id === journeyId) ?? cardJourneys[0] ?? null,
        [cardJourneys, journeyId],
    );
    useEffect(() => {
        setJourneyId(null);
    }, [selectedCard?._id]);

    const { data: detailData, isLoading: isDetailLoading } = useGetRolloverJourneyDetail(selectedJourney?._id ?? null);
    const detail = detailData?.data ?? null;
    const [view, setView] = useState<JourneyView>("all");
    const computed = useMemo(() => (detail ? computeJourney(detail, view) : null), [detail, view]);

    const handleSelectCard = useCallback(
        (cardId: string) => router.replace(`${MENU_KEY.ROLLOVER_JOURNEY}?cardId=${cardId}`),
        [router],
    );
    const handleSelectJourney = useCallback((id: string) => setJourneyId(id), []);

    // Ghi đáo hạn ngay trên trang
    const rollover = useCardRollover();
    const rolloverSource = useMemo(
        () => cards.find((card) => card._id === rollover.rolloverCardId) ?? null,
        [cards, rollover.rolloverCardId],
    );
    const openRollover = useCallback(() => {
        if (selectedCard) rollover.openRollover(selectedCard._id);
    }, [selectedCard, rollover]);

    // Kết thúc hành trình
    const [endModalOpen, setEndModalOpen] = useState(false);
    const { mutateAsync: endJourney, isPending: isEnding } = useEndRolloverJourney();
    const handleEndJourney = useCallback(
        async (values: IFromEndRolloverJourneyData) => {
            if (!selectedJourney) return;
            try {
                await endJourney({ id: selectedJourney._id, body: values });
                notification.success({ title: "Đã kết thúc hành trình" });
                setEndModalOpen(false);
            } catch (error: unknown) {
                notification.error({ title: getErrorMessage(error, "Kết thúc hành trình thất bại") });
            }
        },
        [selectedJourney, endJourney, notification],
    );

    // Sửa số tiền gốc
    const [baseModalOpen, setBaseModalOpen] = useState(false);
    const { mutateAsync: updateJourney, isPending: isUpdatingBase } = useUpdateRolloverJourney();
    const handleUpdateBase = useCallback(
        async (baseAmount: number) => {
            if (!selectedJourney) return;
            try {
                await updateJourney({ id: selectedJourney._id, body: { baseAmount } });
                notification.success({ title: "Đã cập nhật số tiền gốc" });
                setBaseModalOpen(false);
            } catch (error: unknown) {
                notification.error({ title: getErrorMessage(error, "Cập nhật thất bại") });
            }
        },
        [selectedJourney, updateJourney, notification],
    );

    const value = useMemo<IRolloverJourneyContextProps>(
        () => ({
            cards,
            selectedCard,
            journeys,
            cardJourneys,
            selectedJourney,
            detail,
            computed,
            view,
            isLoading: isSourcesLoading || isJourneysLoading,
            isDetailLoading,
            handleSelectCard,
            handleSelectJourney,
            setView,
            rolloverSource,
            openRollover,
            closeRollover: rollover.closeRollover,
            rolloverItems: rollover.rolloverItems,
            isRolloverLoading: rollover.isRolloverLoading,
            isRolloverSubmitting: rollover.isRolloverSubmitting,
            handleRolloverSubmit: rollover.handleRolloverSubmit,
            handleDeleteRollover: rollover.handleDeleteRollover,
            endModalOpen,
            openEndModal: () => setEndModalOpen(true),
            closeEndModal: () => setEndModalOpen(false),
            handleEndJourney,
            isEnding,
            baseModalOpen,
            openBaseModal: () => setBaseModalOpen(true),
            closeBaseModal: () => setBaseModalOpen(false),
            handleUpdateBase,
            isUpdatingBase,
        }),
        [
            cards, selectedCard, journeys, cardJourneys, selectedJourney, detail, computed, view,
            isSourcesLoading, isJourneysLoading, isDetailLoading, handleSelectCard, handleSelectJourney,
            rolloverSource, openRollover, rollover, endModalOpen, handleEndJourney, isEnding,
            baseModalOpen, handleUpdateBase, isUpdatingBase,
        ],
    );

    return <RolloverJourneyContext.Provider value={value}>{children}</RolloverJourneyContext.Provider>;
}

export const useRolloverJourneyContext = () => {
    const context = useContext(RolloverJourneyContext);
    if (!context) {
        throw new Error("useRolloverJourneyContext must be used within a RolloverJourneyContextProvider");
    }
    return context;
};
