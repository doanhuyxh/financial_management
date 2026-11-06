import { createHash, randomBytes } from "crypto";
import mongoose from "mongoose";
import dbConnect from "@/server/connectDb";
import McpTokensModel, { type IMcpToken } from "@/server/models/mcp-tokens.model";
import UserModel from "@/server/models/users.model";
import {
    DEFAULT_MCP_TOKEN_EXPIRY_DAYS,
    MCP_TOKEN_EXPIRY_OPTIONS,
    MCP_TOKEN_LABEL_MAX_LENGTH,
    MCP_TOKEN_MAX_ACTIVE,
    MCP_TOKEN_PREFIX,
    McpTokenScope,
    type IFromMcpTokenData,
    type IMcpTokenData,
} from "@/libs/interfaces/mcpTokensData";
import type { AuthContext } from "../utils/authContext";
import {
    errorResponseWithStatusCode,
    noStore,
    successResponse,
    unauthorizedResponse,
} from "../utils/responseServer";
import { getCurrentUser } from "../utils/getCurrentUser";

const DAY_MS = 24 * 60 * 60 * 1000;
const TOKEN_PATTERN = new RegExp(`^${MCP_TOKEN_PREFIX}[A-Za-z0-9_-]{43}$`);
/** Số ký tự đầu lưu lại để user nhận ra token: tiền tố + 4 ký tự ngẫu nhiên. */
const DISPLAY_PREFIX_LENGTH = MCP_TOKEN_PREFIX.length + 4;
const VERIFY_CACHE_TTL_MS = 60 * 1000;
const LAST_USED_THROTTLE_MS = 60 * 1000;

type VerifiedToken = Omit<AuthContext, "via">;

interface VerifyCacheEntry {
    value: VerifiedToken;
    tokenExpiresAt: number | null;
    cachedUntil: number;
}

declare global {
    var mcpTokenVerifyCache: Map<string, VerifyCacheEntry> | undefined;
    var mcpTokenLastUsedWrite: Map<string, number> | undefined;
}

// Cache trong bộ nhớ process (pm2 1 instance) để mỗi request MCP không phải query DB.
// Thu hồi qua service xóa cache ngay; TTL chỉ giới hạn sai lệch khi sửa DB bằng tay.
const verifyCache = (global.mcpTokenVerifyCache ??= new Map());
const lastUsedWrite = (global.mcpTokenLastUsedWrite ??= new Map());

export function hashMcpToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
}

function invalidateCache(predicate: (value: VerifiedToken) => boolean) {
    for (const [hash, entry] of verifyCache) {
        if (predicate(entry.value)) verifyCache.delete(hash);
    }
}

/** Bỏ tokenHash/userId trước khi trả về client. */
function toMcpTokenData(token: IMcpToken): IMcpTokenData {
    return {
        _id: String(token._id),
        label: token.label ?? "",
        prefix: token.prefix,
        scopes: token.scopes ?? [McpTokenScope.READ],
        expiresAt: token.expiresAt?.toISOString() ?? null,
        isExpired: Boolean(token.expiresAt && token.expiresAt.getTime() <= Date.now()),
        lastUsedAt: token.lastUsedAt?.toISOString() ?? null,
        createdAt: new Date(token.createdAt).toISOString(),
    };
}

function activeFilter(userId: string) {
    return {
        userId,
        revokedAt: null,
        $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
    };
}

async function touchLastUsed(tokenId: string) {
    const now = Date.now();
    if ((lastUsedWrite.get(tokenId) ?? 0) + LAST_USED_THROTTLE_MS > now) return;
    lastUsedWrite.set(tokenId, now);
    try {
        await McpTokensModel.updateOne({ _id: tokenId }, { $set: { lastUsedAt: new Date(now) } });
    } catch (error) {
        console.error("MCP: failed to update token lastUsedAt", error);
    }
}

export class McpTokensService {
    static async listTokens() {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) return unauthorizedResponse();

        const tokens = await McpTokensModel.find({ userId: user.userId, revokedAt: null })
            .sort({ createdAt: -1 })
            .lean<IMcpToken[]>();
        return noStore(successResponse(tokens.map(toMcpTokenData)));
    }

    static async createToken(data: IFromMcpTokenData) {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) return unauthorizedResponse();

        const expiresInDays =
            data?.expiresInDays === undefined ? DEFAULT_MCP_TOKEN_EXPIRY_DAYS : data.expiresInDays;
        if (!MCP_TOKEN_EXPIRY_OPTIONS.some((option) => option.value === expiresInDays)) {
            return errorResponseWithStatusCode("Hạn dùng không hợp lệ", 400);
        }

        const label = typeof data?.label === "string" ? data.label.trim() : "";
        if (label.length > MCP_TOKEN_LABEL_MAX_LENGTH) {
            return errorResponseWithStatusCode(
                `Tên token tối đa ${MCP_TOKEN_LABEL_MAX_LENGTH} ký tự`,
                400,
            );
        }

        const activeCount = await McpTokensModel.countDocuments(activeFilter(user.userId));
        if (activeCount >= MCP_TOKEN_MAX_ACTIVE) {
            return errorResponseWithStatusCode(
                `Tối đa ${MCP_TOKEN_MAX_ACTIVE} token đang hoạt động. Thu hồi bớt token cũ trước.`,
                400,
            );
        }

        const token = `${MCP_TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;
        const created = await McpTokensModel.create({
            userId: user.userId,
            tokenHash: hashMcpToken(token),
            prefix: token.slice(0, DISPLAY_PREFIX_LENGTH),
            label,
            scopes: [McpTokenScope.READ],
            expiresAt: expiresInDays ? new Date(Date.now() + expiresInDays * DAY_MS) : null,
        });

        return noStore(
            successResponse({ ...toMcpTokenData(created), token }, "Tạo token thành công"),
        );
    }

    static async revokeToken(tokenId: string) {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) return unauthorizedResponse();
        if (!mongoose.isValidObjectId(tokenId)) {
            return errorResponseWithStatusCode("Không tìm thấy token", 404);
        }

        const revoked = await McpTokensModel.findOneAndUpdate(
            { _id: tokenId, userId: user.userId, revokedAt: null },
            { $set: { revokedAt: new Date() } },
        );
        if (!revoked) {
            return errorResponseWithStatusCode("Không tìm thấy token", 404);
        }

        invalidateCache((value) => value.tokenId === tokenId);
        return successResponse(null, "Đã thu hồi token");
    }

    static async revokeAllTokens() {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) return unauthorizedResponse();

        const result = await McpTokensModel.updateMany(
            { userId: user.userId, revokedAt: null },
            { $set: { revokedAt: new Date() } },
        );
        invalidateCache((value) => value.userId === user.userId);
        return successResponse(
            { revoked: result.modifiedCount },
            `Đã thu hồi ${result.modifiedCount} token`,
        );
    }

    /**
     * Xác thực Bearer token của request MCP. `userId` của MCP lấy từ đây (không từ input).
     * Sai định dạng, không tồn tại, đã thu hồi, hết hạn hay user đã bị xóa đều trả null như nhau.
     */
    static async verifyBearer(rawToken: string): Promise<VerifiedToken | null> {
        if (!TOKEN_PATTERN.test(rawToken)) return null;
        const tokenHash = hashMcpToken(rawToken);
        const now = Date.now();

        const cached = verifyCache.get(tokenHash);
        if (cached && cached.cachedUntil > now) {
            if (cached.tokenExpiresAt !== null && cached.tokenExpiresAt <= now) {
                verifyCache.delete(tokenHash);
                return null;
            }
            void touchLastUsed(cached.value.tokenId);
            return cached.value;
        }

        await dbConnect();
        const token = await McpTokensModel.findOne({
            tokenHash,
            revokedAt: null,
            $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date(now) } }],
        }).lean<IMcpToken>();
        if (!token) {
            verifyCache.delete(tokenHash);
            return null;
        }

        const userExists = await UserModel.exists({ _id: token.userId });
        if (!userExists) return null;

        const value: VerifiedToken = {
            userId: String(token.userId),
            tokenId: String(token._id),
            scopes: token.scopes ?? [McpTokenScope.READ],
        };
        verifyCache.set(tokenHash, {
            value,
            tokenExpiresAt: token.expiresAt ? token.expiresAt.getTime() : null,
            cachedUntil: now + VERIFY_CACHE_TTL_MS,
        });
        void touchLastUsed(value.tokenId);
        return value;
    }
}
