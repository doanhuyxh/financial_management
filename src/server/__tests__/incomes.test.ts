import { describe, expect, test } from "bun:test";
import { ExpensesService } from "@/server/services/expenses.service";
import { IncomesService } from "@/server/services/incomes.service";
import { CategoryKind } from "@/libs/interfaces/categoriesData";
import { SourcesOfMoneyType } from "@/libs/interfaces/sourcesOfMoneyData";
import { call, expectLedgerMatches, makeCategory, makeSource, trackedOf } from "./helpers";

describe("Thu nhập", () => {
    test("không ghi vào thẻ tín dụng", async () => {
        const card = await makeSource({ type: SourcesOfMoneyType.CREDIT_CARD, currentDebt: 100_000 });
        const categoryId = await makeCategory(CategoryKind.INCOME, "Lương");
        const res = await call(IncomesService.createIncome({ categoryId, sourceOfMoneyId: card, amount: 50_000 }));
        expect(res.status).toBe(400);
        expect(await trackedOf(card)).toBe(100_000);
    });

    test("xóa khi đã tiêu hết: 400, số dư giữ nguyên", async () => {
        const source = await makeSource();
        const incomeCategory = await makeCategory(CategoryKind.INCOME, "Lương");
        const expenseCategory = await makeCategory();
        const income = await call(IncomesService.createIncome({ categoryId: incomeCategory, sourceOfMoneyId: source, amount: 100_000 }));
        await call(ExpensesService.createExpense({ categoryId: expenseCategory, sourceOfMoneyId: source, amount: 80_000 }));

        const res = await call(IncomesService.deleteIncome(income.data._id));
        expect(res.status).toBe(400);
        expect(await trackedOf(source)).toBe(20_000);
        await expectLedgerMatches(source);
    });

    test("sửa tăng trên cùng nguồn không đòi đủ số cũ", async () => {
        const source = await makeSource();
        const incomeCategory = await makeCategory(CategoryKind.INCOME, "Lương");
        const expenseCategory = await makeCategory();
        const income = await call(IncomesService.createIncome({ categoryId: incomeCategory, sourceOfMoneyId: source, amount: 100_000 }));
        await call(ExpensesService.createExpense({ categoryId: expenseCategory, sourceOfMoneyId: source, amount: 50_000 }));

        const res = await call(
            IncomesService.updateIncome(income.data._id, { categoryId: incomeCategory, sourceOfMoneyId: source, amount: 110_000 }),
        );
        expect(res.status).toBe(200);
        expect(await trackedOf(source)).toBe(60_000);
        await expectLedgerMatches(source);
    });

    test("sửa giảm nhiều hơn số dư còn lại: 400", async () => {
        const source = await makeSource();
        const incomeCategory = await makeCategory(CategoryKind.INCOME, "Lương");
        const expenseCategory = await makeCategory();
        const income = await call(IncomesService.createIncome({ categoryId: incomeCategory, sourceOfMoneyId: source, amount: 100_000 }));
        await call(ExpensesService.createExpense({ categoryId: expenseCategory, sourceOfMoneyId: source, amount: 50_000 }));

        const res = await call(
            IncomesService.updateIncome(income.data._id, { categoryId: incomeCategory, sourceOfMoneyId: source, amount: 40_000 }),
        );
        expect(res.status).toBe(400);
        expect(await trackedOf(source)).toBe(50_000);
        await expectLedgerMatches(source);
    });
});
