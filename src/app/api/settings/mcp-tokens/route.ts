import type { NextRequest } from "next/server";
import { errorResponseWithStatusCode } from "@/server/utils/responseServer";
import { McpTokensService } from "@/server/services/mcp-tokens.service";

export async function GET() {
    try {
        return await McpTokensService.listTokens();
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Something went wrong";
        return errorResponseWithStatusCode(message);
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        return await McpTokensService.createToken(body);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Something went wrong";
        return errorResponseWithStatusCode(message);
    }
}

/** Thu hồi tất cả token MCP của user. */
export async function DELETE() {
    try {
        return await McpTokensService.revokeAllTokens();
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Something went wrong";
        return errorResponseWithStatusCode(message);
    }
}
