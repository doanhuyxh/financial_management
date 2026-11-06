import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MCP_GUIDE_URI, MCP_SERVER_INSTRUCTIONS } from "./guide";
import { registerReportTools } from "./tools/reports";
import { registerSourceTools } from "./tools/sources";
import { registerTransactionTools } from "./tools/transactions";

export const MCP_SERVER_NAME = "money-manager";
export const MCP_SERVER_VERSION = "1.0.0";

/**
 * Tạo MCP server chỉ đọc. Chế độ stateless: mỗi request HTTP tạo một server + transport mới.
 * Nghiệp vụ: .agents/business/mcp.md
 */
export function createMcpServer() {
    const server = new McpServer(
        { name: MCP_SERVER_NAME, version: MCP_SERVER_VERSION },
        { instructions: MCP_SERVER_INSTRUCTIONS },
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
            contents: [{ uri: uri.href, mimeType: "text/markdown", text: MCP_SERVER_INSTRUCTIONS }],
        }),
    );

    registerSourceTools(server);
    registerTransactionTools(server);
    registerReportTools(server);
    return server;
}
