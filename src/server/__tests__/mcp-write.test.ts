import { describe, expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import ExpensesModel from "@/server/models/expenses.model";
import TransactionAuditsModel from "@/server/models/transaction-audits.model";
import UserModel from "@/server/models/users.model";
import { ExpensesService } from "@/server/services/expenses.service";
import { McpTokensService } from "@/server/services/mcp-tokens.service";
import { SettingsService } from "@/server/services/settings.service";
import { handleMcpRequest } from "@/server/mcp/handleMcpRequest";
import { toTransactionDate } from "@/server/mcp/tools/writes";
import { CategoryKind } from "@/libs/interfaces/categoriesData";
import { McpTokenScope } from "@/libs/interfaces/mcpTokensData";
import { SourcesOfMoneyType } from "@/libs/interfaces/sourcesOfMoneyData";
import { TransactionAuditAction, TransactionAuditKind } from "@/libs/interfaces/transactionAuditsData";
import { vietnamDayKey } from "@/server/utils/dayRange";
import { call, expectLedgerMatches, makeCategory, makeSource, objectId, testAuth, trackedOf } from "./helpers";

const ENDPOINT = "http://localhost:3000/api/mcp";
const WRITE_TOOLS = ["create_expense", "create_income"];

async function createToken(allowWrite: boolean) {
    await UserModel.updateOne(
        { _id: testAuth.userId },
        { $setOnInsert: { email: `${testAuth.userId}@test` } },
        { upsert: true },
    );
    const { status, data } = await call(
        McpTokensService.createToken({ label: "agent", expiresInDays: 90, allowWrite }),
    );
    expect(status).toBe(200);
    return data as { _id: string; token: string; scopes: string[] };
}

async function connectClient(token: string) {
    const transport = new StreamableHTTPClientTransport(new URL(ENDPOINT), {
        requestInit: { headers: { Authorization: `Bearer ${token}` } },
        fetch: (url, init) => handleMcpRequest(new Request(url, init)),
    });
    const client = new Client({ name: "test", version: "0.0.0" });
    await client.connect(transport);
    return client;
}

type ToolResult = Awaited<ReturnType<Client["callTool"]>>;
const textOf = (result: ToolResult) => (result.content as { text?: string }[])[0]?.text ?? "";
const parseText = (result: ToolResult) => JSON.parse(textOf(result) || "null");

describe("MCP ghi — scope", () => {
    test("token chỉ đọc: không thấy tool ghi, instructions báo read-only", async () => {
        const { token, scopes } = await createToken(false);
        expect(scopes).toEqual([McpTokenScope.READ]);
        const client = await connectClient(token);
        const names = (await client.listTools()).tools.map((tool) => tool.name);
        for (const name of WRITE_TOOLS) expect(names).not.toContain(name);
        expect(client.getInstructions()).toContain("read-only");

        // Gọi thẳng tên tool ghi cũng không chạy
        const result = await client.callTool({
            name: "create_expense",
            arguments: { categoryId: objectId(), sourceOfMoneyId: objectId(), amount: 1000, idempotencyKey: "key-12345678" },
        });
        expect(result.isError).toBe(true);
        expect(await ExpensesModel.countDocuments()).toBe(0);
        await client.close();
    });

    test("token có ghi: chỉ thấy tool tạo chi tiêu/thu nhập (không có chuyển tiền), annotations không readOnly, bắt buộc idempotencyKey", async () => {
        const { token, scopes } = await createToken(true);
        expect(scopes).toEqual([McpTokenScope.READ, McpTokenScope.WRITE]);
        const client = await connectClient(token);
        const tools = (await client.listTools()).tools.filter((tool) => WRITE_TOOLS.includes(tool.name));
        expect(tools.map((tool) => tool.name).sort()).toEqual([...WRITE_TOOLS].sort());
        const allNames = (await client.listTools()).tools.map((tool) => tool.name);
        expect(allNames.filter((name) => /create|update|delete|transfer/.test(name) && !name.startsWith("list_")).sort()).toEqual(
            [...WRITE_TOOLS].sort(),
        );
        for (const tool of tools) {
            expect(tool.annotations?.readOnlyHint).toBe(false);
            expect(tool.inputSchema.required).toContain("idempotencyKey");
            expect(tool.inputSchema.properties).not.toHaveProperty("userId");
        }
        expect(client.getInstructions()).toContain("idempotencyKey");
        await client.close();
    });
});

describe("MCP ghi — tạo giao dịch", () => {
    test("create_expense trừ số dư, gửi lại cùng khóa không tạo trùng, có dòng lịch sử 'Tạo' qua agent", async () => {
        const sourceId = await makeSource({ balance: 1_000_000 });
        const categoryId = await makeCategory();
        const { _id: tokenId, token } = await createToken(true);
        const client = await connectClient(token);

        const args = { categoryId, sourceOfMoneyId: sourceId, amount: 150_000, note: "Cơm trưa", idempotencyKey: "exp-key-0001" };
        const first = await client.callTool({ name: "create_expense", arguments: args });
        expect(first.isError).toBeFalsy();
        const created = parseText(first);
        expect(created.amount).toBe(150_000);
        expect(created).not.toHaveProperty("userId");

        const replay = await client.callTool({ name: "create_expense", arguments: args });
        expect(parseText(replay)._id).toBe(created._id);
        expect(await ExpensesModel.countDocuments({ userId: testAuth.userId })).toBe(1);
        expect(await trackedOf(sourceId)).toBe(850_000);

        // Cùng khóa, khác input → lỗi, không ghi
        const conflict = await client.callTool({ name: "create_expense", arguments: { ...args, amount: 1 } });
        expect(conflict.isError).toBe(true);

        const audits = await TransactionAuditsModel.find({ userId: testAuth.userId }).lean<
            { action: string; kind: string; via: string; tokenId: unknown; after: { amount?: number } }[]
        >();
        expect(audits).toHaveLength(1);
        expect(audits[0]).toMatchObject({
            action: TransactionAuditAction.CREATE,
            kind: TransactionAuditKind.EXPENSE,
            via: "mcp",
            after: { amount: 150_000, note: "Cơm trưa" },
        });
        expect(String(audits[0].tokenId)).toBe(tokenId);

        await expectLedgerMatches(sourceId);
        await client.close();
    });

    test("tạo trên web không ghi lịch sử 'Tạo'", async () => {
        const sourceId = await makeSource({ balance: 100_000 });
        const categoryId = await makeCategory();
        await call(ExpensesService.createExpense({ categoryId, sourceOfMoneyId: sourceId, amount: 10_000 }));
        expect(await TransactionAuditsModel.countDocuments({ userId: testAuth.userId })).toBe(0);
    });

    test("create_income cộng số dư; thu nhập vào thẻ bị chặn; chuyển tiền không có qua MCP", async () => {
        const bank = await makeSource({ balance: 0, name: "Ngân hàng" });
        const card = await makeSource({ type: SourcesOfMoneyType.CREDIT_CARD, currentDebt: 300_000 });
        const incomeCategory = await makeCategory(CategoryKind.INCOME, "Lương");
        const { token } = await createToken(true);
        const client = await connectClient(token);

        const income = await client.callTool({
            name: "create_income",
            arguments: { categoryId: incomeCategory, sourceOfMoneyId: bank, amount: 2_000_000, idempotencyKey: "inc-key-0001" },
        });
        expect(income.isError).toBeFalsy();

        // Thu nhập vào thẻ bị service chặn, message trả nguyên cho agent
        const toCard = await client.callTool({
            name: "create_income",
            arguments: { categoryId: incomeCategory, sourceOfMoneyId: card, amount: 1_000, idempotencyKey: "inc-key-0002" },
        });
        expect(toCard.isError).toBe(true);
        expect(textOf(toCard)).toContain("thẻ tín dụng");

        const transfer = await client.callTool({
            name: "create_transfer",
            arguments: { fromSourceId: bank, toSourceId: card, amount: 300_000, idempotencyKey: "trf-key-0001" },
        });
        expect(transfer.isError).toBe(true);
        expect(await trackedOf(bank)).toBe(2_000_000);
        expect(await trackedOf(card)).toBe(300_000);

        const kinds = (
            await TransactionAuditsModel.find({ userId: testAuth.userId }).lean<{ kind: string }[]>()
        ).map((audit) => audit.kind);
        expect(kinds).toEqual([TransactionAuditKind.INCOME]);

        await expectLedgerMatches(bank, card);
        await client.close();
    });

    test("không đủ số dư / kỳ đã khóa sổ → lỗi, số dư giữ nguyên; khóa được dùng lại sau khi sửa", async () => {
        const sourceId = await makeSource({ balance: 50_000 });
        const categoryId = await makeCategory();
        const { token } = await createToken(true);
        const client = await connectClient(token);

        const base = { categoryId, sourceOfMoneyId: sourceId, idempotencyKey: "retry-key-001" };
        const tooMuch = await client.callTool({ name: "create_expense", arguments: { ...base, amount: 60_000 } });
        expect(tooMuch.isError).toBe(true);
        // Lỗi thì khóa được giải phóng: cùng khóa, số tiền đã sửa → tạo được
        const fixed = await client.callTool({ name: "create_expense", arguments: { ...base, amount: 40_000 } });
        expect(fixed.isError).toBeFalsy();

        const today = vietnamDayKey(new Date());
        expect((await call(SettingsService.updateSettings({ ledgerLockedBefore: today }))).status).toBe(200);
        const locked = await client.callTool({
            name: "create_expense",
            arguments: { ...base, amount: 1_000, date: "2020-01-01", idempotencyKey: "locked-key-01" },
        });
        expect(locked.isError).toBe(true);
        expect(textOf(locked)).toContain("khóa sổ");

        expect(await trackedOf(sourceId)).toBe(10_000);
        await expectLedgerMatches(sourceId);
        await client.close();
    });

    test("input sai (số lẻ, id sai, thiếu khóa) bị chặn trước khi tới service", async () => {
        const { token } = await createToken(true);
        const client = await connectClient(token);
        const valid = { categoryId: objectId(), sourceOfMoneyId: objectId(), amount: 1_000, idempotencyKey: "valid-key-01" };
        for (const args of [
            { ...valid, amount: 1_000.5 },
            { ...valid, categoryId: "abc" },
            { ...valid, idempotencyKey: "short" },
            { ...valid, idempotencyKey: undefined },
        ]) {
            const result = await client.callTool({ name: "create_expense", arguments: args });
            expect(result.isError).toBe(true);
        }
        expect(await ExpensesModel.countDocuments()).toBe(0);
        await client.close();
    });

    test("userId lấy từ token: nguồn của user khác → lỗi", async () => {
        const ownerId = testAuth.userId;
        const { token } = await createToken(true);
        testAuth.userId = objectId();
        const foreignSource = await makeSource({ balance: 1_000_000 });
        const foreignCategory = await makeCategory();
        testAuth.userId = ownerId;

        const client = await connectClient(token);
        const result = await client.callTool({
            name: "create_expense",
            arguments: { categoryId: foreignCategory, sourceOfMoneyId: foreignSource, amount: 1_000, idempotencyKey: "foreign-key-1" },
        });
        expect(result.isError).toBe(true);
        expect(await trackedOf(foreignSource)).toBe(1_000_000);
        await client.close();
    });
});

describe("MCP ghi — ngày giờ", () => {
    test("toTransactionDate: trống/hôm nay → thời điểm hiện tại; ngày cũ → 12:00 giờ VN; có giờ → đúng giờ", () => {
        const now = new Date("2026-11-06T03:00:00.000Z"); // 10:00 giờ VN
        expect(toTransactionDate(undefined, undefined, now)).toBeUndefined();
        expect(toTransactionDate("2026-11-06", undefined, now)).toBeUndefined();
        expect(toTransactionDate("2026-11-01", undefined, now)).toBe("2026-11-01T12:00:00+07:00");
        expect(toTransactionDate("2026-11-06", "08:15", now)).toBe("2026-11-06T08:15:00+07:00");
    });
});
