import { describe, expect, test } from "bun:test";
import mongoose from "mongoose";
import IntegrityIssuesModel from "@/server/models/integrity-issues.model";
import SourcesOfMoneyModel from "@/server/models/sources-of-money.model";
import { BalanceReconcileService } from "@/server/services/balance-reconcile.service";
import { ExpensesService } from "@/server/services/expenses.service";
import { ReconcileBlockReason } from "@/libs/interfaces/balanceReconcileData";
import { SourcesOfMoneyType } from "@/libs/interfaces/sourcesOfMoneyData";
import { call, expectLedgerMatches, makeCategory, makeSource, testAuth, trackedOf } from "./helpers";

describe("Đối soát số dư", () => {
    test("nguồn mới có giao dịch: khớp sổ", async () => {
        const source = await makeSource({ balance: 100_000 });
        const categoryId = await makeCategory();
        await call(ExpensesService.createExpense({ categoryId, sourceOfMoneyId: source, amount: 30_000 }));
        const res = await call(BalanceReconcileService.getReconcile(source));
        expect(res.data).toMatchObject({ stored: 70_000, ledger: 70_000, diff: 0, ledgerComplete: true, canApply: false });
    });

    test("số lưu bị lệch: phát hiện và sửa về theo sổ, ghi vết, đóng issue cũ", async () => {
        const source = await makeSource({ balance: 100_000 });
        await SourcesOfMoneyModel.updateOne({ _id: source }, { $inc: { balance: 5_000 } });
        await IntegrityIssuesModel.create({ userId: testAuth.userId, sourceOfMoneyId: source, operation: "expense.create", step: "revert-balance" });

        const check = await call(BalanceReconcileService.getReconcile(source));
        expect(check.data).toMatchObject({ stored: 105_000, ledger: 100_000, diff: 5_000, canApply: true, openIssues: 1 });

        const conflict = await call(BalanceReconcileService.applyReconcile(source, { expectedStored: 100_000, expectedLedger: 100_000 }));
        expect(conflict.status).toBe(409);

        const applied = await call(BalanceReconcileService.applyReconcile(source, { expectedStored: 105_000, expectedLedger: 100_000 }));
        expect(applied.status).toBe(200);
        expect(await trackedOf(source)).toBe(100_000);
        expect(await IntegrityIssuesModel.countDocuments({ resolvedAt: null })).toBe(0);
        expect(await IntegrityIssuesModel.countDocuments({ operation: "reconcile" })).toBe(1);
        await expectLedgerMatches(source);
    });

    test("nguồn cũ chưa có sổ cái đầy đủ: báo lệch nhưng không cho sửa", async () => {
        const { insertedId } = await SourcesOfMoneyModel.collection.insertOne({
            userId: new mongoose.Types.ObjectId(testAuth.userId),
            name: "Cũ",
            type: SourcesOfMoneyType.BANK,
            balance: 300_000,
            sortOrder: 0,
            archivedAt: null,
        });
        const id = insertedId.toString();
        const check = await call(BalanceReconcileService.getReconcile(id));
        expect(check.data).toMatchObject({
            diff: 300_000,
            canApply: false,
            blockReason: ReconcileBlockReason.LEDGER_INCOMPLETE,
        });
        const apply = await call(BalanceReconcileService.applyReconcile(id, { expectedStored: 300_000, expectedLedger: 0 }));
        expect(apply.status).toBe(400);
        expect(await trackedOf(id)).toBe(300_000);
    });

    test("thẻ có số theo sổ vượt hạn mức: không tự sửa", async () => {
        const card = await makeSource({ type: SourcesOfMoneyType.CREDIT_CARD, creditLimit: 1_000_000, currentDebt: 900_000 });
        // Hạ hạn mức trực tiếp: sổ cái 900k > hạn mức 500k
        await SourcesOfMoneyModel.updateOne(
            { _id: card },
            { $set: { "creditDetails.creditLimit": 500_000, "creditDetails.currentDebt": 400_000 } },
        );
        const check = await call(BalanceReconcileService.getReconcile(card));
        expect(check.data).toMatchObject({ canApply: false, blockReason: ReconcileBlockReason.LEDGER_OUT_OF_RANGE });
    });
});
