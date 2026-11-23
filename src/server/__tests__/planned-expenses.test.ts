import { describe, expect, test } from "bun:test";
import ExpensesModel from "@/server/models/expenses.model";
import PlannedExpensesModel from "@/server/models/planned-expenses.model";
import SourcesOfMoneyModel from "@/server/models/sources-of-money.model";
import { ExpensesService } from "@/server/services/expenses.service";
import { TransfersService } from "@/server/services/transfers.service";
import { PlannedExpensesService } from "@/server/services/planned-expenses.service";
import { SourcesOfMoneyService } from "@/server/services/sources-of-money.service";
import { PlannedExpenseStatus } from "@/libs/interfaces/plannedExpensesData";
import { SourcesOfMoneyType } from "@/libs/interfaces/sourcesOfMoneyData";
import { vietnamDayKey } from "@/server/utils/dayRange";
import { call, expectLedgerMatches, makeCategory, makeSource, trackedOf } from "./helpers";

const CARD = SourcesOfMoneyType.CREDIT_CARD;
const DAY_MS = 24 * 60 * 60 * 1000;
const dayFromNow = (days: number) => vietnamDayKey(new Date(Date.now() + days * DAY_MS));

async function reservedOf(sourceId: string) {
    const source = await SourcesOfMoneyModel.findById(sourceId).lean<{ reservedAmount?: number }>();
    return source?.reservedAmount ?? 0;
}

async function plan(sourceOfMoneyId: string, categoryId: string, amount: number, days = 3) {
    return call(
        PlannedExpensesService.createPlannedExpense({
            categoryId,
            sourceOfMoneyId,
            amount,
            plannedDate: dayFromNow(days),
        }),
    );
}

/** Đưa ngày dự kiến về quá khứ để xác nhận được. */
async function makeDue(id: string, daysAgo = 1) {
    await PlannedExpensesModel.updateOne(
        { _id: id },
        { $set: { plannedAt: new Date(Date.now() - daysAgo * DAY_MS) } },
    );
}

describe("Chi dự kiến — tạo", () => {
    test("giữ chỗ, không đổi số dư; thiếu phần khả dụng thì 400", async () => {
        const source = await makeSource({ balance: 100_000 });
        const categoryId = await makeCategory();

        const ok = await plan(source, categoryId, 70_000);
        expect(ok.status).toBe(200);
        expect(await trackedOf(source)).toBe(100_000);
        expect(await reservedOf(source)).toBe(70_000);

        const fail = await plan(source, categoryId, 30_001);
        expect(fail.status).toBe(400);
        expect(fail.body.message).toContain("đang giữ");
        expect(await reservedOf(source)).toBe(70_000);
        await expectLedgerMatches(source);
    });

    test("ngày hôm nay, quá khứ hoặc sai định dạng bị từ chối", async () => {
        const source = await makeSource({ balance: 100_000 });
        const categoryId = await makeCategory();
        for (const plannedDate of [dayFromNow(0), dayFromNow(-2), "abc", dayFromNow(3000)]) {
            const res = await call(
                PlannedExpensesService.createPlannedExpense({ categoryId, sourceOfMoneyId: source, amount: 1_000, plannedDate }),
            );
            expect(res.status).toBe(400);
        }
        expect(await reservedOf(source)).toBe(0);
    });

    test("thẻ: giữ chỗ hạn mức", async () => {
        const card = await makeSource({ type: CARD, creditLimit: 1_000_000 });
        const categoryId = await makeCategory();
        expect((await plan(card, categoryId, 800_000)).status).toBe(200);
        expect((await plan(card, categoryId, 200_001)).status).toBe(400);
        expect(await trackedOf(card)).toBe(0);
        expect(await reservedOf(card)).toBe(800_000);
    });
});

describe("Chi dự kiến — chặn chi hiện tại vượt phần khả dụng", () => {
    test("chi tiêu và chuyển tiền đi chỉ trong số dư − giữ chỗ", async () => {
        const source = await makeSource({ balance: 100_000 });
        const other = await makeSource({ balance: 0, name: "Ví" });
        const categoryId = await makeCategory();
        await plan(source, categoryId, 60_000);

        const over = await call(ExpensesService.createExpense({ categoryId, sourceOfMoneyId: source, amount: 40_001 }));
        expect(over.status).toBe(400);
        expect(over.body.message).toContain("đang giữ");
        expect((await call(ExpensesService.createExpense({ categoryId, sourceOfMoneyId: source, amount: 40_000 }))).status).toBe(200);

        const transfer = await call(
            TransfersService.createTransfer({ fromSourceId: source, toSourceId: other, amount: 1 }),
        );
        expect(transfer.status).toBe(400);
        // Còn 60k nhưng đều đang giữ chỗ
        expect(await trackedOf(source)).toBe(60_000);
        await expectLedgerMatches(source, other);
    });

    test("thẻ: chi tiêu chỉ trong hạn mức − dư nợ − giữ chỗ", async () => {
        const card = await makeSource({ type: CARD, creditLimit: 1_000_000 });
        const categoryId = await makeCategory();
        await plan(card, categoryId, 700_000);
        expect((await call(ExpensesService.createExpense({ categoryId, sourceOfMoneyId: card, amount: 300_001 }))).status).toBe(400);
        expect((await call(ExpensesService.createExpense({ categoryId, sourceOfMoneyId: card, amount: 300_000 }))).status).toBe(200);
        await expectLedgerMatches(card);
    });

    test("không có giữ chỗ thì thông báo cũ giữ nguyên", async () => {
        const source = await makeSource({ balance: 10 });
        const categoryId = await makeCategory();
        const res = await call(ExpensesService.createExpense({ categoryId, sourceOfMoneyId: source, amount: 11 }));
        expect(res.body.message).toBe("Số dư nguồn tiền không đủ");
    });
});

describe("Chi dự kiến — sửa", () => {
    test("cùng nguồn: giữ thêm/bớt theo chênh lệch; đổi nguồn: chuyển giữ chỗ", async () => {
        const a = await makeSource({ balance: 100_000, name: "A" });
        const b = await makeSource({ balance: 50_000, name: "B" });
        const categoryId = await makeCategory();
        const { data } = await plan(a, categoryId, 40_000);
        const base = { categoryId, plannedDate: dayFromNow(3) };

        expect((await call(PlannedExpensesService.updatePlannedExpense(data._id, { ...base, sourceOfMoneyId: a, amount: 90_000 }))).status).toBe(200);
        expect(await reservedOf(a)).toBe(90_000);
        expect((await call(PlannedExpensesService.updatePlannedExpense(data._id, { ...base, sourceOfMoneyId: a, amount: 100_001 }))).status).toBe(400);
        expect(await reservedOf(a)).toBe(90_000);

        expect((await call(PlannedExpensesService.updatePlannedExpense(data._id, { ...base, sourceOfMoneyId: b, amount: 50_001 }))).status).toBe(400);
        expect(await reservedOf(a)).toBe(90_000);
        expect(await reservedOf(b)).toBe(0);

        expect((await call(PlannedExpensesService.updatePlannedExpense(data._id, { ...base, sourceOfMoneyId: b, amount: 50_000 }))).status).toBe(200);
        expect(await reservedOf(a)).toBe(0);
        expect(await reservedOf(b)).toBe(50_000);
    });

    test("khoản đã tới hạn: giữ nguyên ngày thì sửa được, đổi sang hôm nay thì không", async () => {
        const source = await makeSource({ balance: 100_000 });
        const categoryId = await makeCategory();
        const { data } = await plan(source, categoryId, 10_000);
        await makeDue(data._id, 2);
        const keep = await call(
            PlannedExpensesService.updatePlannedExpense(data._id, {
                categoryId, sourceOfMoneyId: source, amount: 20_000, plannedDate: dayFromNow(-2),
            }),
        );
        expect(keep.status).toBe(200);
        const today = await call(
            PlannedExpensesService.updatePlannedExpense(data._id, {
                categoryId, sourceOfMoneyId: source, amount: 20_000, plannedDate: dayFromNow(0),
            }),
        );
        expect(today.status).toBe(400);
        expect(await reservedOf(source)).toBe(20_000);
    });
});

describe("Chi dự kiến — hủy và xác nhận", () => {
    test("hủy: bỏ giữ chỗ, không tạo giao dịch; hủy lần hai bị từ chối", async () => {
        const source = await makeSource({ balance: 100_000 });
        const categoryId = await makeCategory();
        const { data } = await plan(source, categoryId, 30_000);
        await makeDue(data._id, 0);

        expect((await call(PlannedExpensesService.cancelPlannedExpense(data._id))).status).toBe(200);
        expect(await reservedOf(source)).toBe(0);
        expect(await trackedOf(source)).toBe(100_000);
        expect(await ExpensesModel.countDocuments()).toBe(0);
        expect((await call(PlannedExpensesService.cancelPlannedExpense(data._id))).status).toBe(400);
        await expectLedgerMatches(source);
    });

    test("xác nhận trước ngày dự kiến bị từ chối", async () => {
        const source = await makeSource({ balance: 100_000 });
        const categoryId = await makeCategory();
        const { data } = await plan(source, categoryId, 30_000);
        expect((await call(PlannedExpensesService.confirmPlannedExpense(data._id))).status).toBe(400);
        expect(await reservedOf(source)).toBe(30_000);
    });

    test("xác nhận: chuyển giữ chỗ thành chi tiêu, sổ cái khớp; không xác nhận hai lần", async () => {
        const source = await makeSource({ balance: 100_000 });
        const card = await makeSource({ type: CARD, creditLimit: 1_000_000 });
        const categoryId = await makeCategory();
        const p1 = (await plan(source, categoryId, 30_000)).data;
        const p2 = (await plan(card, categoryId, 200_000)).data;
        await makeDue(p1._id);
        await makeDue(p2._id);

        const res = await call(PlannedExpensesService.confirmPlannedExpense(p1._id));
        expect(res.status).toBe(200);
        expect(res.data.status).toBe(PlannedExpenseStatus.CONFIRMED);
        expect(res.data.expenseId).toBeTruthy();
        expect(await trackedOf(source)).toBe(70_000);
        expect(await reservedOf(source)).toBe(0);
        expect((await call(PlannedExpensesService.confirmPlannedExpense(p1._id))).status).toBe(400);

        expect((await call(PlannedExpensesService.confirmPlannedExpense(p2._id))).status).toBe(200);
        expect(await trackedOf(card)).toBe(200_000);
        expect(await reservedOf(card)).toBe(0);
        expect(await ExpensesModel.countDocuments()).toBe(2);
        await expectLedgerMatches(source, card);
    });

    test("tạo chi tiêu lỗi thì hoàn số dư, giữ chỗ và trạng thái chờ", async () => {
        const source = await makeSource({ balance: 100_000 });
        const categoryId = await makeCategory();
        const { data } = await plan(source, categoryId, 30_000);
        await makeDue(data._id);

        const original = ExpensesModel.create.bind(ExpensesModel);
        (ExpensesModel as any).create = () => Promise.reject(new Error("boom"));
        try {
            expect((await call(PlannedExpensesService.confirmPlannedExpense(data._id))).status).toBe(400);
        } finally {
            (ExpensesModel as any).create = original;
        }
        expect(await trackedOf(source)).toBe(100_000);
        expect(await reservedOf(source)).toBe(30_000);
        const doc = await PlannedExpensesModel.findById(data._id).lean<{ status: string }>();
        expect(doc?.status).toBe(PlannedExpenseStatus.PENDING);
        await expectLedgerMatches(source);
    });

    test("không xóa được nguồn đang có chi dự kiến", async () => {
        const source = await makeSource({ balance: 0 });
        const card = await makeSource({ type: CARD, creditLimit: 1_000_000 });
        const categoryId = await makeCategory();
        await plan(card, categoryId, 1_000);
        const res = await call(SourcesOfMoneyService.deleteSourcesOfMoney(card));
        expect(res.status).toBe(400);
        expect((await call(SourcesOfMoneyService.deleteSourcesOfMoney(source))).status).toBe(200);
    });
});
