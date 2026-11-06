import { describe, expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import UserModel from "@/server/models/users.model";
import { ExpensesService } from "@/server/services/expenses.service";
import { McpTokensService } from "@/server/services/mcp-tokens.service";
import { consumeMcpRateLimit, handleMcpRequest } from "@/server/mcp/handleMcpRequest";
import { MCP_GUIDE_URI } from "@/server/mcp/guide";
import { call, makeCategory, makeSource, objectId, testAuth } from "./helpers";

const ENDPOINT = "http://localhost:3000/api/mcp";

async function ensureUser(userId = testAuth.userId) {
    await UserModel.updateOne({ _id: userId }, { $setOnInsert: { email: `${userId}@test` } }, { upsert: true });
}

async function createToken() {
    await ensureUser();
    const { status, data } = await call(McpTokensService.createToken({ label: "test", expiresInDays: 90 }));
    expect(status).toBe(200);
    return data as { _id: string; token: string };
}

/** Client MCP thật, nhưng "mạng" là gọi thẳng handler của route (không cần server HTTP). */
async function connectClient(token: string) {
    const transport = new StreamableHTTPClientTransport(new URL(ENDPOINT), {
        requestInit: { headers: { Authorization: `Bearer ${token}` } },
        fetch: (url, init) => handleMcpRequest(new Request(url, init)),
    });
    const client = new Client({ name: "test", version: "0.0.0" });
    await client.connect(transport);
    return client;
}

function parseText(result: Awaited<ReturnType<Client["callTool"]>>) {
    const content = result.content as { type: string; text?: string }[];
    return JSON.parse(content[0]?.text ?? "null");
}

function rawPost(headers: Record<string, string>) {
    return handleMcpRequest(
        new Request(ENDPOINT, {
            method: "POST",
            headers: { "content-type": "application/json", accept: "application/json, text/event-stream", ...headers },
            body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" }),
        }),
    );
}

describe("MCP — xác thực ở route", () => {
    test("không token / token sai → 401 kèm WWW-Authenticate; token đúng → 200", async () => {
        const noToken = await rawPost({});
        expect(noToken.status).toBe(401);
        expect(noToken.headers.get("www-authenticate")).toContain("Bearer");
        expect((await rawPost({ Authorization: "Bearer mm_pat_wrong" })).status).toBe(401);

        const { token } = await createToken();
        const ok = await rawPost({ Authorization: `Bearer ${token}` });
        expect(ok.status).toBe(200);
        expect(ok.headers.get("cache-control")).toBe("no-store");
    });

    test("Origin lạ → 403; Origin của app thì được", async () => {
        const { token } = await createToken();
        const auth = { Authorization: `Bearer ${token}` };
        expect((await rawPost({ ...auth, Origin: "https://evil.example" })).status).toBe(403);
        expect((await rawPost({ ...auth, Origin: "http://localhost:3000" })).status).toBe(200);
    });

    test("quá 60 request/phút theo token → false", () => {
        const tokenId = objectId();
        for (let i = 0; i < 60; i += 1) expect(consumeMcpRateLimit(tokenId, 1_000)).toBe(true);
        expect(consumeMcpRateLimit(tokenId, 1_000)).toBe(false);
        // Cửa sổ mới thì đếm lại
        expect(consumeMcpRateLimit(tokenId, 1_000 + 60_001)).toBe(true);
    });
});

describe("MCP — tool", () => {
    test("chỉ đăng ký tool đọc; có resource hướng dẫn", async () => {
        const { token } = await createToken();
        const client = await connectClient(token);
        const { tools } = await client.listTools();
        expect(tools.length).toBeGreaterThanOrEqual(15);
        for (const tool of tools) {
            expect(tool.annotations?.readOnlyHint).toBe(true);
            expect(tool.name).not.toMatch(/create|update|delete|apply|revoke/);
        }
        const guide = await client.readResource({ uri: MCP_GUIDE_URI });
        expect((guide.contents[0] as { text?: string })?.text).toContain("VND");
        await client.close();
    });

    test("userId lấy từ token: không thấy dữ liệu của user khác dù cookie giả lập là user khác", async () => {
        const ownerId = testAuth.userId;
        const mySource = await makeSource({ balance: 500_000, name: "Ví của tôi" });
        const categoryId = await makeCategory();
        await call(ExpensesService.createExpense({ categoryId, sourceOfMoneyId: mySource, amount: 120_000, note: "Cơm" }));
        const { token } = await createToken();

        // Chuyển "cookie" sang user B rồi tạo dữ liệu của B
        testAuth.userId = objectId();
        const otherSource = await makeSource({ balance: 999, name: "Ví người khác" });

        const client = await connectClient(token);

        const sources = parseText(await client.callTool({ name: "list_sources_of_money", arguments: {} }));
        expect(sources.items.map((item: { _id: string }) => item._id)).toEqual([mySource]);
        expect(sources.items[0]).not.toHaveProperty("userId");

        const expenses = parseText(await client.callTool({ name: "list_expenses", arguments: {} }));
        expect(expenses.summary).toEqual({ count: 1, totalAmount: 120_000 });

        const history = parseText(
            await client.callTool({ name: "get_source_transactions", arguments: { sourceId: mySource } }),
        );
        expect(history.items.map((item: { delta: number }) => item.delta)).toEqual([-120_000, 500_000]);

        const foreign = await client.callTool({ name: "get_source_transactions", arguments: { sourceId: otherSource } });
        expect(foreign.isError).toBe(true);

        const badId = await client.callTool({ name: "get_source_transactions", arguments: { sourceId: "abc" } });
        expect(badId.isError).toBe(true);

        await client.close();
        testAuth.userId = ownerId;
    });

    test("dashboard theo tháng và cài đặt đọc được qua tool", async () => {
        const { token } = await createToken();
        const client = await connectClient(token);
        const cashflow = parseText(await client.callTool({ name: "get_cashflow_summary", arguments: { year: 2026, month: 1 } }));
        expect(cashflow).toMatchObject({ totalIncome: 0, totalExpense: 0, net: 0 });
        const settings = parseText(await client.callTool({ name: "get_settings", arguments: {} }));
        expect(settings).toEqual({ ledgerLockedBefore: null });
        await client.close();
    });
});
