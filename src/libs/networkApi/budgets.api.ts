import { fetcherBackEnd } from "@/libs/fetchFromBackEnd";
import type ApiResponse from "@/libs/interfaces/ApiResponseData";
import type {
    IBudgetData,
    IBudgetsQuery,
    IBudgetsSummary,
    IFromBudgetData,
} from "@/libs/interfaces/budgetsData";

export const getBudgets = async (query: IBudgetsQuery) => {
    const params = new URLSearchParams({
        year: String(query.year),
        month: String(query.month),
    });
    return fetcherBackEnd<ApiResponse<IBudgetsSummary>>(`/budgets?${params.toString()}`, {
        method: "GET",
    });
};

export const createBudget = async (body: IFromBudgetData) => {
    return fetcherBackEnd<ApiResponse<IBudgetData>>("/budgets", {
        method: "POST",
        body,
    });
};

export const updateBudget = async (id: string, body: Pick<IFromBudgetData, "amount">) => {
    return fetcherBackEnd<ApiResponse<IBudgetData>>(`/budgets/${id}`, {
        method: "PUT",
        body,
    });
};

export const deleteBudget = async (id: string) => {
    return fetcherBackEnd<ApiResponse<null>>(`/budgets/${id}`, {
        method: "DELETE",
    });
};
