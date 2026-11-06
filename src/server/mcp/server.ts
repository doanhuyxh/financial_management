import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpTokenScope } from "@/libs/interfaces/mcpTokensData";
import { buildMcpInstructions, MCP_GUIDE_URI } from "./guide";
import { registerReportTools } from "./tools/reports";
import { registerSourceTools } from "./tools/sources";
import { registerTransactionTools } from "./tools/transactions";
import { registerWriteTools } from "./tools/writes";

export const MCP_SERVER_NAME = "money-manager";
export const MCP_SERVER_VERSION = "1.1.0";

/**
 * Tạo MCP server theo scope của token. Chế độ stateless: mỗi request HTTP tạo một server + transport mới.
 * Tool ghi chỉ đăng ký khi có scope `write` (handler tool ghi vẫn tự kiểm lại scope).
 * Nghiệp vụ: .agents/business/mcp.md
 */
export function createMcpServer(scopes: readonly string[] = [McpTokenScope.READ]) {
    const canWrite = scopes.includes(McpTokenScope.WRITE);
    const instructions = buildMcpInstructions(canWrite);
    const server = new McpServer(
        { name: MCP_SERVER_NAME, version: MCP_SERVER_VERSION },
        { instructions },
    );

    server.registerResource(
        "guide",
        MCP_GUIDE_URI,
        {
            title: "How to read Money Manager data",
            description: "Units, timezone, credit card debt sign, what counts as spending.",
            mimeType: "text/markdown",
        },
        async (uri) => ({
            contents: [{ uri: uri.href, mimeType: "text/markdown", text: instructions }],
        }),
    );

    registerSourceTools(server);
    registerTransactionTools(server);
    registerReportTools(server);
    if (canWrite) registerWriteTools(server);
    return server;
}
