/** Token cá nhân để agent kết nối MCP (`/api/mcp`). Nghiệp vụ: .agents/business/mcp.md */

export enum McpTokenScope {
    READ = "read",
}

/** Hạn dùng chọn được khi tạo token (số ngày, null = không hạn). */
export const MCP_TOKEN_EXPIRY_OPTIONS = [
    { value: 30, label: "30 ngày" },
    { value: 90, label: "90 ngày" },
    { value: null, label: "Không hạn" },
] as const;

export const DEFAULT_MCP_TOKEN_EXPIRY_DAYS = 90;
export const MCP_TOKEN_PREFIX = "mm_pat_";
export const MCP_TOKEN_LABEL_MAX_LENGTH = 100;
/** Số token còn hiệu lực tối đa của một user. */
export const MCP_TOKEN_MAX_ACTIVE = 10;
export const MCP_ENDPOINT_PATH = "/api/mcp";

export type McpTokenExpiryDays = (typeof MCP_TOKEN_EXPIRY_OPTIONS)[number]["value"];

export interface IMcpTokenData {
    _id: string;
    label: string;
    /** Vài ký tự đầu của token để nhận biết, VD `mm_pat_ab12` */
    prefix: string;
    scopes: McpTokenScope[];
    expiresAt?: string | null;
    /** Server tính lúc trả về. */
    isExpired: boolean;
    lastUsedAt?: string | null;
    createdAt: string;
}

/** Token chỉ trả về đúng một lần, ngay khi tạo. */
export interface ICreatedMcpTokenData extends IMcpTokenData {
    token: string;
}

export interface IFromMcpTokenData {
    label?: string;
    expiresInDays: McpTokenExpiryDays;
}

export const MCP_SERVER_KEY = "money-manager";

/** Lệnh mẫu để thêm server vào Claude Code. */
export function buildClaudeMcpAddCommand(origin: string, token: string) {
    return `claude mcp add --transport http ${MCP_SERVER_KEY} ${origin}${MCP_ENDPOINT_PATH} --header "Authorization: Bearer ${token}"`;
}

export interface IMcpClientSnippet {
    id: string;
    label: string;
    /** Chạy trong terminal hay dán vào file cấu hình */
    kind: "command" | "file";
    /** Đường dẫn file cấu hình / ghi chú ngắn hiện dưới snippet */
    hint: string;
    build: (origin: string, token: string) => string;
}

/**
 * Snippet kết nối cho từng agent. Định dạng theo tài liệu từng client (xem .agents/business/mcp.md);
 * client đổi định dạng thì sửa ở đây.
 */
export const MCP_CLIENT_SNIPPETS: IMcpClientSnippet[] = [
    {
        id: "claude-code",
        label: "Claude Code",
        kind: "command",
        hint: "Chạy trong terminal. Claude Desktop: thêm qua Settings → Connectors cần OAuth, dùng Claude Code hoặc cầu nối mcp-remote thay thế.",
        build: buildClaudeMcpAddCommand,
    },
    {
        id: "codex",
        label: "Codex",
        kind: "file",
        hint: "Dán vào ~/.codex/config.toml (hoặc .codex/config.toml của dự án đã trust).",
        build: (origin, token) =>
            [
                `[mcp_servers.${MCP_SERVER_KEY}]`,
                `url = "${origin}${MCP_ENDPOINT_PATH}"`,
                `http_headers = { Authorization = "Bearer ${token}" }`,
            ].join("\n"),
    },
    {
        id: "copilot",
        label: "GitHub Copilot (VS Code)",
        kind: "file",
        hint: "Dán vào .vscode/mcp.json (hoặc mcp.json cấp user). VS Code hỏi token khi khởi động server, nên token không nằm trong file.",
        build: (origin) =>
            JSON.stringify(
                {
                    servers: {
                        [MCP_SERVER_KEY]: {
                            type: "http",
                            url: `${origin}${MCP_ENDPOINT_PATH}`,
                            headers: { Authorization: `Bearer \${input:${MCP_SERVER_KEY}-token}` },
                        },
                    },
                    inputs: [
                        {
                            type: "promptString",
                            id: `${MCP_SERVER_KEY}-token`,
                            description: "Money Manager MCP token (mm_pat_…)",
                            password: true,
                        },
                    ],
                },
                null,
                2,
            ),
    },
    {
        id: "antigravity",
        label: "Antigravity",
        kind: "file",
        hint: "Dán vào ~/.gemini/antigravity/mcp_config.json rồi khởi động lại. Antigravity chỉ nhận khóa serverUrl, không nhận url.",
        build: (origin, token) =>
            JSON.stringify(
                {
                    mcpServers: {
                        [MCP_SERVER_KEY]: {
                            serverUrl: `${origin}${MCP_ENDPOINT_PATH}`,
                            headers: { Authorization: `Bearer ${token}` },
                        },
                    },
                },
                null,
                2,
            ),
    },
];
