import { z } from "zod";
import type { McpServer, RegisteredTool } from "@modelcontextprotocol/sdk/server/mcp.js";
import { runWithAuth, type AuthContext } from "@/server/utils/authContext";
import { callService, toolError } from "./callService";

/** `authInfo.extra` do route `/api/mcp` gắn sau khi verify token. */
export interface McpAuthExtra {
    userId: string;
    tokenId: string;
}

interface ToolExtra {
    authInfo?: { scopes: string[]; extra?: Record<string, unknown> };
}

// ----- Schema input dùng chung
export const objectIdSchema = z.string().regex(/^[a-f0-9]{24}$/i, "Must be a 24-char hex id");
export const daySchema = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD (Vietnam time)");
export const pageSchema = z.number().int().min(1).optional().describe("Page number, starts at 1");
export const limitSchema = z.number().int().min(1).max(100).optional().describe("Items per page, max 100");

function readAuthContext(extra: ToolExtra): AuthContext | null {
    const info = extra.authInfo;
    const auth = info?.extra as Partial<McpAuthExtra> | undefined;
    if (!info || !auth?.userId || !auth.tokenId) return null;
    return { userId: auth.userId, tokenId: auth.tokenId, scopes: info.scopes, via: "mcp" };
}

/**
 * Đăng ký tool chỉ đọc: handler mỏng như route.ts — nhận input đã validate, gọi một service có sẵn.
 * Service chạy trong auth context của token (getCurrentUser() đọc từ đây), nên vẫn lọc userId như cũ.
 *
 * Kiểu args suy từ zod v3 của project; không đi qua generic `ToolCallback<Shape>` của SDK
 * (so sánh kiểu zod v3/v4 rất sâu, tsc tràn bộ nhớ — TS2589).
 */
export function registerReadTool<Shape extends z.ZodRawShape>(
    server: McpServer,
    name: string,
    config: { title: string; description: string; inputSchema: Shape },
    run: (args: z.infer<z.ZodObject<Shape>>) => Promise<Response>,
) {
    const callback = async (args: z.infer<z.ZodObject<Shape>>, extra: ToolExtra) => {
        const context = readAuthContext(extra);
        if (!context) return toolError("Unauthorized");
        return runWithAuth(context, () => callService(() => run(args)));
    };

    const register = server.registerTool.bind(server) as (
        toolName: string,
        toolConfig: Record<string, unknown>,
        cb: unknown,
    ) => RegisteredTool;

    return register(
        name,
        {
            ...config,
            annotations: {
                title: config.title,
                readOnlyHint: true,
                idempotentHint: true,
                openWorldHint: false,
            },
        },
        callback,
    );
}
