import { fetcherBackEnd } from "@/libs/fetchFromBackEnd";
import type ApiResponse from "@/libs/interfaces/ApiResponseData";
import type { ITransactionListResponse } from "@/libs/interfaces/ApiResponseData";
import type { ITransferSuggestions } from "@/libs/interfaces/suggestionsData";
import type {
    IFromTransfersData,
    IPaginatedTransfersQuery,
    ITransfersData,
} from "@/libs/interfaces/transfersData";

function buildTransfersQuery(query: IPaginatedTransfersQuery = {}) {
    const params = new URLSearchParams();
    if (query.page) params.set("page", String(query.page));
    if (query.limit) params.set("limit", String(query.limit));
    if (query.search) params.set("search", query.search);
    if (query.fromSourceId) params.set("fromSourceId", query.fromSourceId);
    if (query.toSourceId) params.set("toSourceId", query.toSourceId);
    if (query.from) params.set("from", query.from);
    if (query.to) params.set("to", query.to);
    const qs = params.toString();
    return qs ? `?${qs}` : "";
}

export const getTransfers = async (query: IPaginatedTransfersQuery = {}) => {
    return fetcherBackEnd<ApiResponse<ITransactionListResponse<ITransfersData>>>(
        `/transfers${buildTransfersQuery(query)}`,
        { method: "GET" },
    );
};

export const getTransferSuggestions = async () => {
    return fetcherBackEnd<ApiResponse<ITransferSuggestions>>("/transfers/suggestions", {
        method: "GET",
    });
};

/** `idempotencyKey`: gửi lại cùng khóa thì server trả kết quả cũ, không tạo trùng */
export const createTransfer = async (body: IFromTransfersData, idempotencyKey?: string) => {
    return fetcherBackEnd<ApiResponse<ITransfersData>>("/transfers", {
        method: "POST",
        body,
        headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined,
    });
};

export const deleteTransfer = async (id: string) => {
    return fetcherBackEnd<ApiResponse<null>>(`/transfers/${id}`, {
        method: "DELETE",
    });
};
