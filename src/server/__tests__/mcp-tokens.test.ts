import { describe, expect, test } from "bun:test";
import McpTokensModel from "@/server/models/mcp-tokens.model";
import UserModel from "@/server/models/users.model";
import { McpTokensService, hashMcpToken } from "@/server/services/mcp-tokens.service";
import { MCP_TOKEN_MAX_ACTIVE, MCP_TOKEN_PREFIX } from "@/libs/interfaces/mcpTokensData";
import { call, objectId, testAuth } from "./helpers";

/** User phải tồn tại trong DB thì verifyBearer mới nhận token. */
async function ensureUser(userId = testAuth.userId) {
    await UserModel.updateOne({ _id: userId }, { $setOnInsert: { email: `${userId}@test` } }, { upsert: true });
}

async function createToken(label = "Claude Code", expiresInDays: 30 | 90 | null = 90) {
    const { status, data } = await call(McpTokensService.createToken({ label, expiresInDays }));
    expect(status).toBe(200);
    return data as { _id: string; token: string; prefix: string };
}

describe("Token MCP — tạo", () => {
    test("trả token đúng một lần, DB chỉ lưu hash", async () => {
        const created = await createToken();
        expect(created.token.startsWith(MCP_TOKEN_PREFIX)).toBe(true);
        expect(created.prefix).toBe(created.token.slice(0, MCP_TOKEN_PREFIX.length + 4));

        const stored = await McpTokensModel.findById(created._id).lean<{ tokenHash: string }>();
        expect(stored?.tokenHash).toBe(hashMcpToken(created.token));
        expect(JSON.stringify(stored)).not.toContain(created.token);

        const list = await call(McpTokensService.listTokens());
        expect(list.data).toHaveLength(1);
        expect(JSON.stringify(list.data)).not.toContain(created.token);
        expect(list.data[0]).not.toHaveProperty("tokenHash");
        expect(list.data[0]).not.toHaveProperty("userId");
    });

    test("hạn dùng không hợp lệ, tên quá dài, quá số token tối đa → 400", async () => {
        const badExpiry = await call(McpTokensService.createToken({ expiresInDays: 7 as unknown as 30 }));
        expect(badExpiry.status).toBe(400);

        const badLabel = await call(McpTokensService.createToken({ label: "x".repeat(101), expiresInDays: 30 }));
        expect(badLabel.status).toBe(400);

        for (let i = 0; i < MCP_TOKEN_MAX_ACTIVE; i += 1) await createToken(`t${i}`);
        const over = await call(McpTokensService.createToken({ expiresInDays: 30 }));
        expect(over.status).toBe(400);
    });
});

describe("Token MCP — verifyBearer", () => {
    test("token đúng → userId của chủ token; sai/thu hồi/hết hạn/user bị xóa → null", async () => {
        await ensureUser();
        const created = await createToken();

        const ok = await McpTokensService.verifyBearer(created.token);
        expect(ok).toEqual({ userId: testAuth.userId, tokenId: created._id, scopes: ["read"] });

        expect(await McpTokensService.verifyBearer("")).toBeNull();
        expect(await McpTokensService.verifyBearer("Bearer abc")).toBeNull();
        expect(await McpTokensService.verifyBearer(`${created.token.slice(0, -1)}x`)).toBeNull();

        // Thu hồi có hiệu lực ngay dù kết quả đang cache
        expect((await call(McpTokensService.revokeToken(created._id))).status).toBe(200);
        expect(await McpTokensService.verifyBearer(created.token)).toBeNull();
        expect((await call(McpTokensService.revokeToken(created._id))).status).toBe(404);

        const expired = await createToken("expired", 30);
        await McpTokensModel.updateOne({ _id: expired._id }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
        expect(await McpTokensService.verifyBearer(expired.token)).toBeNull();

        const orphan = await createToken("orphan");
        await UserModel.deleteOne({ _id: testAuth.userId });
        expect(await McpTokensService.verifyBearer(orphan.token)).toBeNull();
    });

    test("thu hồi tất cả: mọi token của user mất hiệu lực, không đụng user khác", async () => {
        await ensureUser();
        const mine = await createToken("mine");
        const ownerId = testAuth.userId;

        testAuth.userId = objectId();
        await ensureUser();
        const other = await createToken("other");

        testAuth.userId = ownerId;
        const result = await call(McpTokensService.revokeAllTokens());
        expect(result.data).toEqual({ revoked: 1 });
        expect(await McpTokensService.verifyBearer(mine.token)).toBeNull();
        expect((await McpTokensService.verifyBearer(other.token))?.userId).not.toBe(ownerId);
    });
});
