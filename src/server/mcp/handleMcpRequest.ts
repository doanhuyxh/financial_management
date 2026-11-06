import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { EnvsConfig } from "@/libs/constants/configKey";
import { McpTokensService } from "@/server/services/mcp-tokens.service";
import { runWithAuth } from "@/server/utils/authContext";
import { errorResponseWithStatusCode, noStore } from "@/server/utils/responseServer";
import type { McpAuthExtra } from "./registerReadTool";
import { createMcpServer } from "./server";

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 60;
const MAX_BODY_BYTES = 64 * 1024;

declare global {
    var mcpRateLimit: Map<string, { count: number; resetAt: number }> | undefined;
}

// Bộ đếm trong bộ nhớ process (pm2 1 instance), theo token
const rateLimit = (global.mcpRateLimit ??= new Map());

/** true nếu token còn quota trong cửa sổ 1 phút hiện tại. */
export function consumeMcpRateLimit(tokenId: string, now = Date.now()) {
    const entry = rateLimit.get(tokenId);
    if (!entry || entry.resetAt <= now) {
        rateLimit.set(tokenId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
        return true;
    }
    entry.count += 1;
    return entry.count <= RATE_LIMIT_MAX_REQUESTS;
}

function getOrigin(url: string | undefined) {
    if (!url) return null;
    try {
        return new URL(url).origin;
    } catch {
        return null;
    }
}

/**
 * Chống DNS rebinding (spec MCP): agent CLI/SDK không gửi Origin; trình duyệt thì có.
 * Chỉ nhận Origin của chính app.
 */
export function isAllowedMcpOrigin(request: Request) {
    const origin = request.headers.get("origin");
    if (!origin) return true;
    const allowed = [getOrigin(request.url), getOrigin(EnvsConfig.CLIENT_BASE_URL)];
    return allowed.includes(origin);
}

function readBearer(request: Request) {
    const header = request.headers.get("authorization") ?? "";
    const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
    return match?.[1] ?? "";
}

function unauthorizedMcp() {
    const response = noStore(errorResponseWithStatusCode("Unauthorized", 401));
    response.headers.set("WWW-Authenticate", 'Bearer realm="money-manager"');
    return response;
}

/**
 * Xử lý một request MCP (Streamable HTTP, stateless, trả JSON).
 * `userId` lấy từ token đã verify, không từ input (luật 1). Không log nội dung request/kết quả.
 */
export async function handleMcpRequest(request: Request): Promise<Response> {
    if (!isAllowedMcpOrigin(request)) {
        return noStore(errorResponseWithStatusCode("Forbidden origin", 403));
    }

    const verified = await McpTokensService.verifyBearer(readBearer(request));
    if (!verified) return unauthorizedMcp();

    if (!consumeMcpRateLimit(verified.tokenId)) {
        const response = noStore(errorResponseWithStatusCode("Too many requests", 429));
        response.headers.set("Retry-After", "60");
        return response;
    }

    const server = createMcpServer();
    const transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
        maxRequestBodySize: MAX_BODY_BYTES,
    });

    try {
        await server.connect(transport);
        const authExtra: McpAuthExtra = { userId: verified.userId, tokenId: verified.tokenId };
        const result = await runWithAuth({ ...verified, via: "mcp" }, () =>
            transport.handleRequest(request, {
                authInfo: {
                    token: verified.tokenId,
                    clientId: verified.tokenId,
                    scopes: verified.scopes,
                    extra: { ...authExtra },
                },
            }),
        );
        const headers = new Headers(result.headers);
        headers.set("Cache-Control", "no-store");
        // JSON response đã dựng xong nên đọc hết body trước khi đóng server
        const body = await result.arrayBuffer();
        return new Response(body.byteLength ? body : null, { status: result.status, headers });
    } finally {
        await server.close().catch(() => undefined);
    }
}
