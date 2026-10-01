import { fetcherBackEnd } from "@/libs/fetchFromBackEnd";
import type ApiResponse from "@/libs/interfaces/ApiResponseData";
import type { PaginatedResponse } from "@/libs/interfaces/ApiResponseData";
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
    return fetcherBackEnd<ApiResponse<PaginatedResponse<ITransfersData>>>(
        `/transfers${buildTransfersQuery(query)}`,
        { method: "GET" },
    );
};

export const createTransfer = async (body: IFromTransfersData) => {
    return fetcherBackEnd<ApiResponse<ITransfersData>>("/transfers", {
        method: "POST",
        body,
    });
};

export const deleteTransfer = async (id: string) => {
    return fetcherBackEnd<ApiResponse<null>>(`/transfers/${id}`, {
        method: "DELETE",
    });
};
