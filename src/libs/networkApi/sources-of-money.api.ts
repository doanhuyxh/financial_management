import { fetcherBackEnd } from "@/libs/fetchFromBackEnd";
import type ApiResponse from "@/libs/interfaces/ApiResponseData";
import type { IBalanceAdjustmentData } from "@/libs/interfaces/balanceAdjustmentsData";
import type { IDefaultQuery } from "@/libs/interfaces/DefaultQuery";
import type { PaginatedResponse } from "@/libs/interfaces/ApiResponseData";
import type {
    ICreditCardFeeProgress,
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

export const reorderSourcesOfMoney = async (orderedIds: string[]) => {
    return fetcherBackEnd<ApiResponse<null>>("/sources-of-money/reorder", {
        method: "PUT",
        body: { orderedIds },
    });
};

export const deleteSourcesOfMoney = async (id: string) => {
    return fetcherBackEnd<ApiResponse<null>>(`/sources-of-money/${id}`, {
        method: "DELETE",
    });
};

export const getBalanceAdjustments = async (sourceId: string, query: IDefaultQuery = {}) => {
    const params = new URLSearchParams();
    if (query.page) params.set("page", String(query.page));
    if (query.limit) params.set("limit", String(query.limit));
    const qs = params.toString();
    return fetcherBackEnd<ApiResponse<PaginatedResponse<IBalanceAdjustmentData>>>(
        `/sources-of-money/${sourceId}/adjustments${qs ? `?${qs}` : ""}`,
        { method: "GET" },
    );
};

export const getCreditCardFeeProgress = async () => {
    return fetcherBackEnd<ApiResponse<ICreditCardFeeProgress[]>>(
        "/sources-of-money/credit-card-fees",
        { method: "GET" },
    );
};
