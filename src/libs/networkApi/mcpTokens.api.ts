import { fetcherBackEnd } from "@/libs/fetchFromBackEnd";
import type ApiResponse from "@/libs/interfaces/ApiResponseData";
import type {
    ICreatedMcpTokenData,
    IFromMcpTokenData,
    IMcpTokenData,
} from "@/libs/interfaces/mcpTokensData";

const BASE_PATH = "/settings/mcp-tokens";

export const getMcpTokens = async () => {
    return fetcherBackEnd<ApiResponse<IMcpTokenData[]>>(BASE_PATH, { method: "GET" });
};

export const createMcpToken = async (body: IFromMcpTokenData) => {
    return fetcherBackEnd<ApiResponse<ICreatedMcpTokenData>>(BASE_PATH, { method: "POST", body });
};

export const revokeMcpToken = async (id: string) => {
    return fetcherBackEnd<ApiResponse<null>>(`${BASE_PATH}/${id}`, { method: "DELETE" });
};

export const revokeAllMcpTokens = async () => {
    return fetcherBackEnd<ApiResponse<{ revoked: number }>>(BASE_PATH, { method: "DELETE" });
};
