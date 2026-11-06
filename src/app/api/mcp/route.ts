import type { NextRequest } from "next/server";
import { errorResponseWithStatusCode } from "@/server/utils/responseServer";
import { handleMcpRequest } from "@/server/mcp/handleMcpRequest";

/**
 * MCP endpoint (Streamable HTTP, stateless). Không qua proxy cookie: xác thực bằng
 * `Authorization: Bearer mm_pat_…` bên trong handleMcpRequest. Nghiệp vụ: .agents/business/mcp.md
 */
export async function POST(req: NextRequest) {
    try {
        return await handleMcpRequest(req);
    } catch (error: unknown) {
        console.error("MCP: request failed", error);
        return errorResponseWithStatusCode("Something went wrong");
    }
}

/** Stateless: không mở stream SSE, không có session để xóa. */
function methodNotAllowed() {
    const response = errorResponseWithStatusCode("Method not allowed", 405);
    response.headers.set("Allow", "POST");
    return response;
}

export const GET = methodNotAllowed;
export const DELETE = methodNotAllowed;
