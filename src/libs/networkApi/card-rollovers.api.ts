import { fetcherBackEnd } from "@/libs/fetchFromBackEnd";
import type ApiResponse from "@/libs/interfaces/ApiResponseData";
import type { PaginatedResponse } from "@/libs/interfaces/ApiResponseData";
import type {
    ICardRolloverData,
    IFromCardRolloverData,
    IPaginatedCardRolloversQuery,
} from "@/libs/interfaces/cardRolloversData";

function buildCardRolloversQuery(query: IPaginatedCardRolloversQuery = {}) {
    const params = new URLSearchParams();
    if (query.page) params.set("page", String(query.page));
    if (query.limit) params.set("limit", String(query.limit));
    if (query.sourceOfMoneyId) params.set("sourceOfMoneyId", query.sourceOfMoneyId);
    if (query.from) params.set("from", query.from);
    if (query.to) params.set("to", query.to);
    const qs = params.toString();
    return qs ? `?${qs}` : "";
}

export const getCardRollovers = async (query: IPaginatedCardRolloversQuery = {}) => {
    return fetcherBackEnd<ApiResponse<PaginatedResponse<ICardRolloverData>>>(
        `/card-rollovers${buildCardRolloversQuery(query)}`,
        { method: "GET" },
    );
};

export const createCardRollover = async (body: IFromCardRolloverData) => {
    return fetcherBackEnd<ApiResponse<ICardRolloverData>>("/card-rollovers", {
        method: "POST",
        body,
    });
};

export const deleteCardRollover = async (id: string) => {
    return fetcherBackEnd<ApiResponse<null>>(`/card-rollovers/${id}`, {
        method: "DELETE",
    });
};
