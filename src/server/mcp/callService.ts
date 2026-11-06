import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

/** Field nội bộ không gửi cho agent. */
const HIDDEN_KEYS = new Set(["userId", "__v", "tokenHash"]);

/** Bỏ field nội bộ (đệ quy). ObjectId/Date đã thành chuỗi sau `res.json()`. */
export function stripInternalFields(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(stripInternalFields);
    if (value && typeof value === "object") {
        const result: Record<string, unknown> = {};
        for (const [key, child] of Object.entries(value)) {
            if (!HIDDEN_KEYS.has(key)) result[key] = stripInternalFields(child);
        }
        return result;
    }
    return value;
}

export function toolError(message: string): CallToolResult {
    return { isError: true, content: [{ type: "text", text: message }] };
}

export function toolJson(data: unknown): CallToolResult {
    return { content: [{ type: "text", text: JSON.stringify(stripInternalFields(data)) }] };
}

/**
 * Service trả `NextResponse` chuẩn `{ status, message, data }` (responseServer.ts).
 * Mở response: thành công → JSON của `data`; thất bại → lỗi tool kèm message của service.
 * Lỗi ném ra (VD sai ObjectId) không lộ stack cho agent.
 */
export async function callService(
    run: () => Promise<Response>,
    failureMessage = "Không đọc được dữ liệu. Kiểm tra lại tham số (id, ngày YYYY-MM-DD).",
): Promise<CallToolResult> {
    try {
        const response = await run();
        const body = (await response.json()) as { status?: boolean; message?: string; data?: unknown };
        if (!body?.status) {
            return toolError(body?.message || `Request failed (${response.status})`);
        }
        return toolJson(body.data);
    } catch (error) {
        console.error("MCP: tool failed", error);
        return toolError(failureMessage);
    }
}
