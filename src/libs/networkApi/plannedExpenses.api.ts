import { fetcherBackEnd } from "@/libs/fetchFromBackEnd";
import type ApiResponse from "@/libs/interfaces/ApiResponseData";
import type {
    IFromPlannedExpensesData,
    IPlannedExpensesData,
    IPlannedExpensesQuery,
} from "@/libs/interfaces/plannedExpensesData";

export const getPlannedExpenses = async (query: IPlannedExpensesQuery = {}) => {
    const qs = query.status ? `?status=${query.status}` : "";
    return fetcherBackEnd<ApiResponse<{ items: IPlannedExpensesData[] }>>(`/planned-expenses${qs}`, {
        method: "GET",
    });
};

/** `idempotencyKey`: gửi lại cùng khóa thì server trả kết quả cũ, không giữ chỗ trùng */
export const createPlannedExpense = async (body: IFromPlannedExpensesData, idempotencyKey?: string) => {
    return fetcherBackEnd<ApiResponse<IPlannedExpensesData>>("/planned-expenses", {
        method: "POST",
        body,
        headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined,
    });
};

export const updatePlannedExpense = async (id: string, body: IFromPlannedExpensesData) => {
    return fetcherBackEnd<ApiResponse<IPlannedExpensesData>>(`/planned-expenses/${id}`, {
        method: "PUT",
        body,
    });
};

export const cancelPlannedExpense = async (id: string) => {
    return fetcherBackEnd<ApiResponse<null>>(`/planned-expenses/${id}/cancel`, { method: "POST" });
};

export const confirmPlannedExpense = async (id: string) => {
    return fetcherBackEnd<ApiResponse<IPlannedExpensesData>>(`/planned-expenses/${id}/confirm`, {
        method: "POST",
    });
};
