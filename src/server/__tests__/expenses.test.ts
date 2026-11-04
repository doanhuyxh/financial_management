import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";
import ExpensesModel from "@/server/models/expenses.model";
import SourcesOfMoneyModel from "@/server/models/sources-of-money.model";
import IntegrityIssuesModel from "@/server/models/integrity-issues.model";
import { ExpensesService } from "@/server/services/expenses.service";
import { TransfersService } from "@/server/services/transfers.service";
import { CardFeeType } from "@/libs/interfaces/expensesData";
import { ForeignFeeType, SourcesOfMoneyType } from "@/libs/interfaces/sourcesOfMoneyData";
import { call, expectLedgerMatches, makeCategory, makeSource, trackedOf } from "./helpers";

const CARD = SourcesOfMoneyType.CREDIT_CARD;

afterEach(() => mock.restore());

describe("Chi tiêu — tạo", () => {
    test("nguồn thường: trừ số dư; không đủ thì 400 và số dư giữ nguyên", async () => {
        const source = await makeSource({ balance: 100_000 });
        const categoryId = await makeCategory();

        const ok = await call(ExpensesService.createExpense({ categoryId, sourceOfMoneyId: source, amount: 40_000 }));
        expect(ok.status).toBe(200);
        expect(await trackedOf(source)).toBe(60_000);

        const fail = await call(ExpensesService.createExpense({ categoryId, sourceOfMoneyId: source, amount: 60_001 }));
        expect(fail.status).toBe(400);
        expect(fail.body.message).toBe("Số dư nguồn tiền không đủ");
        expect(await trackedOf(source)).toBe(60_000);
        await expectLedgerMatches(source);
    });

    test("thẻ: tăng dư nợ; vượt hạn mức thì 400", async () => {
        const card = await makeSource({ type: CARD, creditLimit: 1_000_000 });
        const categoryId = await makeCategory();

        expect((await call(ExpensesService.createExpense({ categoryId, sourceOfMoneyId: card, amount: 900_000 }))).status).toBe(200);
        const fail = await call(ExpensesService.createExpense({ categoryId, sourceOfMoneyId: card, amount: 100_001 }));
        expect(fail.status).toBe(400);
        expect(await trackedOf(card)).toBe(900_000);
        await expectLedgerMatches(card);
    });

    test.each([
        [0.5, "phải là số nguyên"],
        [1e20, "phải từ"],
        [0, "phải từ"],
        ["abc", "không hợp lệ"],
    ])("số tiền %p bị từ chối", async (amount, message) => {
        const source = await makeSource({ balance: 100_000 });
        const categoryId = await makeCategory();
        const res = await call(
            ExpensesService.createExpense({ categoryId, sourceOfMoneyId: source, amount: amount as number }),
        );
        expect(res.status).toBe(400);
        expect(res.body.message).toContain(message);
        expect(await trackedOf(source)).toBe(100_000);
    });

    test("ngày quá xa tương lai hoặc trước năm 2000 bị từ chối", async () => {
        const source = await makeSource({ balance: 100_000 });
        const categoryId = await makeCategory();
        for (const spentAt of ["2099-01-01", "1999-12-31"]) {
            const res = await call(ExpensesService.createExpense({ categoryId, sourceOfMoneyId: source, amount: 1_000, spentAt }));
            expect(res.status).toBe(400);
        }
        expect(await ExpensesModel.countDocuments()).toBe(0);
    });

    test("phí quốc tế: trừ dư nợ một lần cho cả khoản chi và phí", async () => {
        const card = await makeSource({ type: CARD, creditLimit: 10_000_000 });
        await SourcesOfMoneyModel.updateOne({ _id: card }, { $set: { "creditDetails.foreignFxFeePercent": 3 } });
        const categoryId = await makeCategory();

        const res = await call(
            ExpensesService.createExpense({ categoryId, sourceOfMoneyId: card, amount: 1_000_000, foreignFeeType: ForeignFeeType.FX }),
        );
        expect(res.status).toBe(200);
        expect(await trackedOf(card)).toBe(1_030_000);
        expect(await ExpensesModel.countDocuments({ cardFeeType: CardFeeType.FOREIGN_FEE, amount: 30_000 })).toBe(1);
        await expectLedgerMatches(card);
    });

    test("không ghi tay được phí đáo hạn", async () => {
        const card = await makeSource({ type: CARD });
        const categoryId = await makeCategory();
        const res = await call(
            ExpensesService.createExpense({ categoryId, sourceOfMoneyId: card, amount: 1_000, cardFeeType: CardFeeType.ROLLOVER_FEE }),
        );
        expect(res.status).toBe(400);
    });

    test("đồng thời: 5 khoản 30k trên nguồn 100k chỉ 3 khoản qua, số dư không âm", async () => {
        const source = await makeSource({ balance: 100_000 });
        const categoryId = await makeCategory();
        const results = await Promise.all(
            Array.from({ length: 5 }, () =>
                call(ExpensesService.createExpense({ categoryId, sourceOfMoneyId: source, amount: 30_000 })),
            ),
        );
        expect(results.filter((r) => r.status === 200)).toHaveLength(3);
        expect(await trackedOf(source)).toBe(10_000);
        await expectLedgerMatches(source);
    });
});

describe("Chi tiêu — sửa, xóa", () => {
    test("sửa cùng thẻ chỉ cần đủ phần chênh (dư nợ đã giảm do trả nợ)", async () => {
        const card = await makeSource({ type: CARD, creditLimit: 1_000_000 });
        const bank = await makeSource({ balance: 1_000_000 });
        const categoryId = await makeCategory();
        const created = await call(ExpensesService.createExpense({ categoryId, sourceOfMoneyId: card, amount: 500_000 }));
        // Trả nợ 400k: dư nợ còn 100k < 500k nên cách cũ (hoàn 500k rồi ghi lại) bị chặn nhầm
        await call(TransfersService.createTransfer({ fromSourceId: bank, toSourceId: card, amount: 400_000 }));

        const res = await call(
            ExpensesService.updateExpense(created.data._id, { categoryId, sourceOfMoneyId: card, amount: 520_000 }),
        );
        expect(res.status).toBe(200);
        expect(await trackedOf(card)).toBe(120_000);
        await expectLedgerMatches(card, bank);
    });

    test("đổi nguồn: hoàn nguồn cũ, trừ nguồn mới", async () => {
        const a = await makeSource({ balance: 100_000, name: "A" });
        const b = await makeSource({ balance: 100_000, name: "B" });
        const categoryId = await makeCategory();
        const created = await call(ExpensesService.createExpense({ categoryId, sourceOfMoneyId: a, amount: 40_000 }));

        const res = await call(ExpensesService.updateExpense(created.data._id, { categoryId, sourceOfMoneyId: b, amount: 50_000 }));
        expect(res.status).toBe(200);
        expect(await trackedOf(a)).toBe(100_000);
        expect(await trackedOf(b)).toBe(50_000);
        await expectLedgerMatches(a, b);
    });

    test("đổi nguồn mà nguồn mới không đủ: 400, hai nguồn như cũ", async () => {
        const a = await makeSource({ balance: 100_000, name: "A" });
        const b = await makeSource({ balance: 10_000, name: "B" });
        const categoryId = await makeCategory();
        const created = await call(ExpensesService.createExpense({ categoryId, sourceOfMoneyId: a, amount: 40_000 }));

        const res = await call(ExpensesService.updateExpense(created.data._id, { categoryId, sourceOfMoneyId: b, amount: 40_000 }));
        expect(res.status).toBe(400);
        expect(await trackedOf(a)).toBe(60_000);
        expect(await trackedOf(b)).toBe(10_000);
        await expectLedgerMatches(a, b);
    });

    test("xóa hoàn tiền", async () => {
        const source = await makeSource({ balance: 100_000 });
        const categoryId = await makeCategory();
        const created = await call(ExpensesService.createExpense({ categoryId, sourceOfMoneyId: source, amount: 40_000 }));
        expect((await call(ExpensesService.deleteExpense(created.data._id))).status).toBe(200);
        expect(await trackedOf(source)).toBe(100_000);
        await expectLedgerMatches(source);
    });
});

describe("Chi tiêu — rollback", () => {
    test("ghi document lỗi: hoàn số dư, không ghi issue", async () => {
        const source = await makeSource({ balance: 100_000 });
        const categoryId = await makeCategory();
        spyOn(ExpensesModel, "create").mockImplementationOnce(async () => {
            throw new Error("boom");
        });

        const res = await call(ExpensesService.createExpense({ categoryId, sourceOfMoneyId: source, amount: 40_000 }));
        expect(res.status).toBe(400);
        expect(res.body.message).toBe("boom");
        expect(await trackedOf(source)).toBe(100_000);
        expect(await IntegrityIssuesModel.countDocuments()).toBe(0);
    });

    test("chính bước hoàn lỗi: trả lỗi gốc và ghi IntegrityIssue", async () => {
        const source = await makeSource({ balance: 100_000 });
        const categoryId = await makeCategory();
        spyOn(ExpensesModel, "create").mockImplementationOnce(async () => {
            throw new Error("boom");
        });
        const original = SourcesOfMoneyModel.findOneAndUpdate.bind(SourcesOfMoneyModel);
        let calls = 0;
        spyOn(SourcesOfMoneyModel, "findOneAndUpdate").mockImplementation(((...args: unknown[]) => {
            calls += 1;
            if (calls === 2) return Promise.reject(new Error("db down"));
            return (original as (...a: unknown[]) => unknown)(...args);
        }) as never);

        const res = await call(ExpensesService.createExpense({ categoryId, sourceOfMoneyId: source, amount: 40_000 }));
        expect(res.status).toBe(400);
        expect(res.body.message).toBe("boom");
        const issue = await IntegrityIssuesModel.findOne().lean<{ operation: string; step: string; rollbackError: string }>();
        expect(issue).toMatchObject({ operation: "expense.create", step: "revert-balance", rollbackError: "db down" });
    });
});
