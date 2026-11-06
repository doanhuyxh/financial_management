import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Danh tính cho request không dùng cookie (hiện chỉ có MCP, xác thực bằng Personal Access Token).
 * `getCurrentUser()` đọc context này trước cookie, nên service không cần biết request đến từ đâu.
 * `userId` chỉ được đặt sau khi token đã verify (luật 1: không lấy userId từ input).
 */
export interface AuthContext {
    userId: string;
    via: "mcp";
    tokenId: string;
    scopes: string[];
}

declare global {
    var authContextStorage: AsyncLocalStorage<AuthContext> | undefined;
}

// Đặt trên global như connectDb: mọi bundle (route, proxy) trong cùng process dùng chung một storage
const storage = (global.authContextStorage ??= new AsyncLocalStorage<AuthContext>());

export function runWithAuth<T>(context: AuthContext, fn: () => T): T {
    return storage.run(context, fn);
}

export function getAuthContext(): AuthContext | undefined {
    return storage.getStore();
}
