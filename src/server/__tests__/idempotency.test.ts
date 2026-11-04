import { describe, expect, test } from "bun:test";
import ExpensesModel from "@/server/models/expenses.model";
import { ExpensesService } from "@/server/services/expenses.service";
import { withIdempotency } from "@/server/utils/idempotency";
import type { IFromExpensesData } from "@/libs/interfaces/expensesData";
import { makeCategory, makeSource, trackedOf } from "./helpers";

function post(body: IFromExpensesData, key?: string) {
    const request = new Request("http://localhost/api/expenses", {
        method: "POST",
        headers: key ? { "Idempotency-Key": key } : {},
    });
    return withIdempotency(request, "expense.create", body, () => ExpensesService.createExpense(body));
}

describe("Idempotency-Key", () => {
    test("gửi lại cùng khóa: chỉ một khoản chi, response giống nhau", async () => {
        const source = await makeSource({ balance: 100_000 });
        const categoryId = await makeCategory();
        const body = { categoryId, sourceOfMoneyId: source, amount: 10_000 };

        const first = await post(body, "key-aaaaaaaa");
        const second = await post(body, "key-aaaaaaaa");
        expect(first.status).toBe(200);
        expect(second.status).toBe(200);
        expect(second.headers.get("Idempotent-Replayed")).toBe("true");
        expect((await second.json()).data._id).toBe((await first.json()).data._id);
        expect(await ExpensesModel.countDocuments()).toBe(1);
        expect(await trackedOf(source)).toBe(90_000);
    });

    test("lỗi thì không giữ khóa: sửa body và gửi lại cùng khóa được", async () => {
        const source = await makeSource({ balance: 100_000 });
        const categoryId = await makeCategory();
        const bad = await post({ categoryId, sourceOfMoneyId: source, amount: 500_000 }, "key-bbbbbbbb");
        expect(bad.status).toBe(400);
        const good = await post({ categoryId, sourceOfMoneyId: source, amount: 50_000 }, "key-bbbbbbbb");
        expect(good.status).toBe(200);
        expect(await ExpensesModel.countDocuments()).toBe(1);
    });

    test("cùng khóa nhưng body khác sau khi thành công: 422", async () => {
        const source = await makeSource({ balance: 100_000 });
        const categoryId = await makeCategory();
        await post({ categoryId, sourceOfMoneyId: source, amount: 10_000 }, "key-cccccccc");
        const other = await post({ categoryId, sourceOfMoneyId: source, amount: 20_000 }, "key-cccccccc");
        expect(other.status).toBe(422);
        expect(await ExpensesModel.countDocuments()).toBe(1);
    });

    test("gửi đồng thời cùng khóa: chỉ một khoản chi", async () => {
        const source = await makeSource({ balance: 100_000 });
        const categoryId = await makeCategory();
        const body = { categoryId, sourceOfMoneyId: source, amount: 10_000 };
        const responses = await Promise.all([post(body, "key-dddddddd"), post(body, "key-dddddddd")]);
        expect(responses.map((r) => r.status).sort()).toEqual([200, 409]);
        expect(await ExpensesModel.countDocuments()).toBe(1);
    });

    test("không có khóa: chạy bình thường", async () => {
        const source = await makeSource({ balance: 100_000 });
        const categoryId = await makeCategory();
        const body = { categoryId, sourceOfMoneyId: source, amount: 10_000 };
        await post(body);
        await post(body);
        expect(await ExpensesModel.countDocuments()).toBe(2);
    });
});
