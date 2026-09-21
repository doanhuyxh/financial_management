import { fetcherBackEnd } from "@/libs/fetchFromBackEnd";
import type ApiResponse from "@/libs/interfaces/ApiResponseData";
import type {
    IDashboardExpensesSummary,
    IDashboardExpensesSummaryQuery,
} from "@/libs/interfaces/dashboardData";

export const getDashboardExpensesSummary = async (
    query: IDashboardExpensesSummaryQuery,
) => {
    const params = new URLSearchParams({
        year: String(query.year),
        month: String(query.month),
    });

    return fetcherBackEnd<ApiResponse<IDashboardExpensesSummary>>(
        `/dashboard/expenses-summary?${params.toString()}`,
        { method: "GET" },
    );
};
