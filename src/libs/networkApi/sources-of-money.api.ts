import { fetcherBackEnd } from "@/libs/fetchFromBackEnd";
import type ApiResponse from "@/libs/interfaces/ApiResponseData";
import type {
    ICreatedShareLinkData,
    IFromShareLinkData,
    IShareLinkData,
} from "@/libs/interfaces/shareLinksData";
import type {
    ISourceTransactionQuery,
    ISourceTransactionsResponse,
} from "@/libs/interfaces/sourceTransactionsData";
import type { PaginatedResponse } from "@/libs/interfaces/ApiResponseData";
import type {
    IApplyReconcileData,
    IBalanceReconcileData,
} from "@/libs/interfaces/balanceReconcileData";
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

export const getSourceTransactions = async (
    sourceId: string,
    query: ISourceTransactionQuery = {},
) => {
    const params = new URLSearchParams();
    if (query.page) params.set("page", String(query.page));
    if (query.limit) params.set("limit", String(query.limit));
    if (query.kind) params.set("kind", query.kind);
    if (query.from) params.set("from", query.from);
    if (query.to) params.set("to", query.to);
    const qs = params.toString();
    return fetcherBackEnd<ApiResponse<ISourceTransactionsResponse>>(
        `/sources-of-money/${sourceId}/transactions${qs ? `?${qs}` : ""}`,
        { method: "GET" },
    );
};

export const getShareLinks = async (sourceId: string) => {
    return fetcherBackEnd<ApiResponse<IShareLinkData[]>>(`/sources-of-money/${sourceId}/shares`, {
        method: "GET",
    });
};

export const createShareLink = async (sourceId: string, body: IFromShareLinkData) => {
    return fetcherBackEnd<ApiResponse<ICreatedShareLinkData>>(
        `/sources-of-money/${sourceId}/shares`,
        { method: "POST", body },
    );
};

export const revokeShareLink = async (shareId: string) => {
    return fetcherBackEnd<ApiResponse<null>>(`/shares/${shareId}`, { method: "DELETE" });
};

export const getCreditCardFeeProgress = async () => {
    return fetcherBackEnd<ApiResponse<ICreditCardFeeProgress[]>>(
        "/sources-of-money/credit-card-fees",
        { method: "GET" },
    );
};

/** So số dư/dư nợ đang lưu với tổng giao dịch (sổ cái) của một nguồn. */
export const getSourceReconcile = async (sourceId: string) => {
    return fetcherBackEnd<ApiResponse<IBalanceReconcileData>>(
        `/sources-of-money/${sourceId}/reconcile`,
        { method: "GET" },
    );
};

/** Sửa số lưu về đúng sổ cái; 409 nếu số đã đổi so với lúc xem. */
export const applySourceReconcile = async (sourceId: string, body: IApplyReconcileData) => {
    return fetcherBackEnd<ApiResponse<IBalanceReconcileData>>(
        `/sources-of-money/${sourceId}/reconcile`,
        { method: "POST", body },
    );
};
