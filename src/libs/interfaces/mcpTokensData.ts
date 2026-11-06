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

/** Lệnh mẫu để thêm server vào Claude Code. */
export function buildClaudeMcpAddCommand(origin: string, token: string) {
    return `claude mcp add --transport http money-manager ${origin}${MCP_ENDPOINT_PATH} --header "Authorization: Bearer ${token}"`;
}
