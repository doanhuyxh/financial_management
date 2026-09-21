import { fetcherBackEnd } from "@/libs/fetchFromBackEnd";
import type ApiResponse from "@/libs/interfaces/ApiResponseData";
import type { PaginatedResponse } from "@/libs/interfaces/ApiResponseData";
import type {
    IFromSourcesOfMoneyData,
    IPaginatedSourcesOfMoneyQuery,
    ISourcesOfMoneyData,
} from "@/libs/interfaces/sourcesOfMoneyData";

function buildSourcesOfMoneyQuery(query: IPaginatedSourcesOfMoneyQuery = {}) {
    const params = new URLSearchParams();
    if (query.page) params.set("page", String(query.page));
    if (query.limit) params.set("limit", String(query.limit));
    if (query.search) params.set("search", query.search);
    if (query.type) params.set("type", query.type);
    const qs = params.toString();
    return qs ? `?${qs}` : "";
}

export const getSourcesOfMoney = async (query: IPaginatedSourcesOfMoneyQuery = {}) => {
    return fetcherBackEnd<ApiResponse<PaginatedResponse<ISourcesOfMoneyData>>>(
        `/sources-of-money${buildSourcesOfMoneyQuery(query)}`,
        { method: "GET" },
    );
};

export const createSourcesOfMoney = async (body: IFromSourcesOfMoneyData) => {
    return fetcherBackEnd<ApiResponse<ISourcesOfMoneyData>>("/sources-of-money", {
        method: "POST",
        body,
    });
};

export const updateSourcesOfMoney = async (id: string, body: IFromSourcesOfMoneyData) => {
    return fetcherBackEnd<ApiResponse<ISourcesOfMoneyData>>(`/sources-of-money/${id}`, {
        method: "PUT",
        body,
    });
};

export const deleteSourcesOfMoney = async (id: string) => {
    return fetcherBackEnd<ApiResponse<null>>(`/sources-of-money/${id}`, {
        method: "DELETE",
    });
};
