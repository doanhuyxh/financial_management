import { fetcherBackEnd } from "@/libs/fetchFromBackEnd";
import type ApiResponse from "@/libs/interfaces/ApiResponseData";
import type {
    IPaginatedTransactionAuditsQuery,
    ITransactionAuditListData,
} from "@/libs/interfaces/transactionAuditsData";

export const getTransactionAudits = async (query: IPaginatedTransactionAuditsQuery = {}) => {
    const params = new URLSearchParams();
    if (query.page) params.set("page", String(query.page));
    if (query.limit) params.set("limit", String(query.limit));
    if (query.kind) params.set("kind", query.kind);
    const qs = params.toString();
    return fetcherBackEnd<ApiResponse<ITransactionAuditListData>>(
        `/transaction-audits${qs ? `?${qs}` : ""}`,
        { method: "GET" },
    );
};
