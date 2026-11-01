import { fetcherBackEnd } from "@/libs/fetchFromBackEnd";
import type ApiResponse from "@/libs/interfaces/ApiResponseData";
import type { PaginatedResponse } from "@/libs/interfaces/ApiResponseData";
import type {
    IPublicShareInfo,
    IPublicSourceTransactionData,
    ISourceTransactionQuery,
} from "@/libs/interfaces/sourceTransactionsData";

// Người xem link không đăng nhập: không được tự redirect về trang đăng nhập khi gặp 401.

export const getPublicShareInfo = async (token: string) => {
    return fetcherBackEnd<ApiResponse<IPublicShareInfo>>(
        `/public/shares/${encodeURIComponent(token)}`,
        { method: "GET", skipAuthRedirect: true },
    );
};

export const getPublicShareTransactions = async (
    token: string,
    query: Omit<ISourceTransactionQuery, "kind"> = {},
) => {
    const params = new URLSearchParams();
    if (query.page) params.set("page", String(query.page));
    if (query.limit) params.set("limit", String(query.limit));
    if (query.from) params.set("from", query.from);
    if (query.to) params.set("to", query.to);
    const qs = params.toString();
    return fetcherBackEnd<ApiResponse<PaginatedResponse<IPublicSourceTransactionData>>>(
        `/public/shares/${encodeURIComponent(token)}/transactions${qs ? `?${qs}` : ""}`,
        { method: "GET", skipAuthRedirect: true },
    );
};
