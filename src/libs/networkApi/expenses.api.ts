import { fetcherBackEnd } from "@/libs/fetchFromBackEnd";
import type ApiResponse from "@/libs/interfaces/ApiResponseData";
import type { PaginatedResponse } from "@/libs/interfaces/ApiResponseData";
import type {
    IExpensesData,
    IFromExpensesData,
    IPaginatedExpensesQuery,
} from "@/libs/interfaces/expensesData";

function buildExpensesQuery(query: IPaginatedExpensesQuery = {}) {
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

export const getExpenses = async (query: IPaginatedExpensesQuery = {}) => {
    return fetcherBackEnd<ApiResponse<PaginatedResponse<IExpensesData>>>(
        `/expenses${buildExpensesQuery(query)}`,
        { method: "GET" },
    );
};

export const createExpense = async (body: IFromExpensesData) => {
    return fetcherBackEnd<ApiResponse<IExpensesData>>("/expenses", {
        method: "POST",
        body,
    });
};

export const updateExpense = async (id: string, body: IFromExpensesData) => {
    return fetcherBackEnd<ApiResponse<IExpensesData>>(`/expenses/${id}`, {
        method: "PUT",
        body,
    });
};

export const deleteExpense = async (id: string) => {
    return fetcherBackEnd<ApiResponse<null>>(`/expenses/${id}`, {
        method: "DELETE",
    });
};
