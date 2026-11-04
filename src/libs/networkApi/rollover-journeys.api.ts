import { fetcherBackEnd } from "@/libs/fetchFromBackEnd";
import type ApiResponse from "@/libs/interfaces/ApiResponseData";
import type {
    IFromEndRolloverJourneyData,
    IFromUpdateRolloverJourneyData,
    IRolloverJourneyData,
    IRolloverJourneyDetail,
} from "@/libs/interfaces/rolloverJourneysData";

export const getRolloverJourneys = async (cardId?: string) => {
    const qs = cardId ? `?cardId=${encodeURIComponent(cardId)}` : "";
    return fetcherBackEnd<ApiResponse<IRolloverJourneyData[]>>(`/rollover-journeys${qs}`, {
        method: "GET",
    });
};

export const getRolloverJourneyDetail = async (id: string) => {
    return fetcherBackEnd<ApiResponse<IRolloverJourneyDetail>>(`/rollover-journeys/${id}`, {
        method: "GET",
    });
};

export const endRolloverJourney = async (id: string, body: IFromEndRolloverJourneyData) => {
    return fetcherBackEnd<ApiResponse<IRolloverJourneyData>>(`/rollover-journeys/${id}/end`, {
        method: "POST",
        body,
    });
};

export const updateRolloverJourney = async (id: string, body: IFromUpdateRolloverJourneyData) => {
    return fetcherBackEnd<ApiResponse<IRolloverJourneyData>>(`/rollover-journeys/${id}`, {
        method: "PATCH",
        body,
    });
};
