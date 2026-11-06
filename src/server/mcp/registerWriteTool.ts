import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NextResponse } from "next/server";
import { McpTokenScope } from "@/libs/interfaces/mcpTokensData";
import { runWithAuth } from "@/server/utils/authContext";
import { IDEMPOTENCY_KEY_PATTERN, runIdempotent } from "@/server/utils/idempotency";
import { callService, toolError } from "./callService";
import { readAuthContext, registerUntyped, type ToolExtra } from "./registerReadTool";

export const idempotencyKeySchema = z
    .string()
    .regex(IDEMPOTENCY_KEY_PATTERN, "8-100 chars: letters, digits, - or _")
    .describe(
        "Required. A new unique key (e.g. a UUID) per intended transaction. Retrying with the SAME key and same input never creates a duplicate; it returns the first result.",
    );

/**
 * Đăng ký tool ghi (giai đoạn 2). Khác tool đọc:
 * - Chặn theo scope ở đây (token phải có `write`), không ở service.
 * - Bắt buộc `idempotencyKey`: chạy qua `runIdempotent` với cùng `route` như web, nên agent gọi lại
 *   (mạng lỗi, retry) không tạo trùng. Khóa không nằm trong body đem đi hash.
 * - Mọi kiểm tra nghiệp vụ (khóa sổ, tiền/ngày, hạn mức, rollback) vẫn nằm trong service.
 */
export function registerWriteTool<Shape extends z.ZodRawShape>(
    server: McpServer,
    name: string,
    config: { title: string; description: string; idempotencyRoute: string; inputSchema: Shape },
    run: (args: z.infer<z.ZodObject<Shape>>) => Promise<NextResponse>,
) {
    type Args = z.infer<z.ZodObject<Shape>> & { idempotencyKey: string };

    const callback = async (args: Args, extra: ToolExtra) => {
        const context = readAuthContext(extra);
        if (!context) return toolError("Unauthorized");
        if (!context.scopes.includes(McpTokenScope.WRITE)) {
            return toolError("This token is read-only. Create a token with write access in Settings.");
        }
        const { idempotencyKey, ...input } = args;
        return runWithAuth(context, () =>
            callService(() =>
                    runIdempotent(idempotencyKey, config.idempotencyRoute, input, () =>
                        run(input as unknown as z.infer<z.ZodObject<Shape>>),
                    ),
                "Không ghi được giao dịch. Kiểm tra lại tham số (id, số tiền, ngày YYYY-MM-DD).",
            ),
        );
    };

    return registerUntyped(server)(
        name,
        {
            title: config.title,
            description: config.description,
            inputSchema: { ...config.inputSchema, idempotencyKey: idempotencyKeySchema },
            annotations: {
                title: config.title,
                readOnlyHint: false,
                destructiveHint: false,
                idempotentHint: true,
                openWorldHint: false,
            },
        },
        callback,
    );
}
