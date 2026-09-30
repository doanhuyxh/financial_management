import { fetcherBackEnd } from "@/libs/fetchFromBackEnd";
import type ApiResponse from "@/libs/interfaces/ApiResponseData";
import type { PaginatedResponse } from "@/libs/interfaces/ApiResponseData";
import type {
    IFromIncomesData,
    IIncomesData,
    IPaginatedIncomesQuery,
} from "@/libs/interfaces/incomesData";

function buildIncomesQuery(query: IPaginatedIncomesQuery = {}) {
    const params = new URLSearchParams();
    if (query.page) params.set("page", String(query.page));
    if (query.limit) params.set("limit", String(query.limit));
    if (query.search) params.set("search", query.search);
    if (query.categoryId) params.set("categoryId", query.categoryId);
    if (query.sourceOfMoneyId) params.set("sourceOfMoneyId", query.sourceOfMoneyId);
    if (query.from) params.set("from", query.from);
    if (query.to) params.set("to", query.to);
    const qs = params.toString();
    return qs ? `?${qs}` : "";
}

export const getIncomes = async (query: IPaginatedIncomesQuery = {}) => {
    return fetcherBackEnd<ApiResponse<PaginatedResponse<IIncomesData>>>(
        `/incomes${buildIncomesQuery(query)}`,
        { method: "GET" },
    );
};

export const createIncome = async (body: IFromIncomesData) => {
    return fetcherBackEnd<ApiResponse<IIncomesData>>("/incomes", {
        method: "POST",
        body,
    });
};

export const updateIncome = async (id: string, body: IFromIncomesData) => {
    return fetcherBackEnd<ApiResponse<IIncomesData>>(`/incomes/${id}`, {
        method: "PUT",
        body,
    });
};

export const deleteIncome = async (id: string) => {
    return fetcherBackEnd<ApiResponse<null>>(`/incomes/${id}`, {
        method: "DELETE",
    });
};
