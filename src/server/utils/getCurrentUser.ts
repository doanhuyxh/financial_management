import { configCookieKey } from "@/libs/constants/configKey";
import getValueCookieServer from "@/libs/utils/getValueCookieServer";
import dbConnect from "@/server/connectDb";
import UserModel from "@/server/models/users.model";
import { getUserInfoFromToken, type JwtPayload } from "@/server/utils/jwtUtil";

// Cache tokenVersion trong bộ nhớ process (pm2 chạy 1 instance) để proxy + service không query DB
// mỗi request. Logout gọi invalidateTokenVersionCache nên thu hồi có hiệu lực ngay; TTL chỉ là
// giới hạn sai lệch khi chạy nhiều instance hoặc sửa DB bằng tay. Đặt trên global như connectDb
// để proxy và route handler dùng chung một Map.
const TOKEN_VERSION_CACHE_TTL_MS = 60 * 1000;

declare global {
    var tokenVersionCache: Map<string, { tokenVersion: number; expiresAt: number }> | undefined;
}

const tokenVersionCache = (global.tokenVersionCache ??= new Map());

async function getUserTokenVersion(userId: string): Promise<number | null> {
    const cached = tokenVersionCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) return cached.tokenVersion;

    await dbConnect();
    const user = await UserModel.findById(userId).select("tokenVersion").lean();
    if (!user) {
        tokenVersionCache.delete(userId);
        return null;
    }
    const tokenVersion = user.tokenVersion ?? 0;
    tokenVersionCache.set(userId, {
        tokenVersion,
        expiresAt: Date.now() + TOKEN_VERSION_CACHE_TTL_MS,
    });
    return tokenVersion;
}

export function invalidateTokenVersionCache(userId: string) {
    tokenVersionCache.delete(userId);
}

/**
 * Kiểm tra token đầy đủ: chữ ký + user còn tồn tại + tokenVersion khớp (chưa bị logout thu hồi).
 * Lỗi kết nối DB được ném ra để caller tự quyết định, không coi là token sai.
 */
export async function validateAccessToken(accessToken: string): Promise<JwtPayload | null> {
    if (!accessToken) return null;
    const payload = await getUserInfoFromToken(accessToken);
    if (!payload?.userId) return null;

    const tokenVersion = await getUserTokenVersion(payload.userId);
    if (tokenVersion === null) return null;
    if ((payload.tokenVersion ?? 0) !== tokenVersion) return null;
    return payload;
}

export async function getCurrentUser(): Promise<JwtPayload | null> {
    const accessToken = await getValueCookieServer(configCookieKey.ACCESS_TOKEN_KEY);
    return validateAccessToken(accessToken);
}
