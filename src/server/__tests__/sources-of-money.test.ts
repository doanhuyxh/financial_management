import { describe, expect, test } from "bun:test";
import mongoose from "mongoose";
import BalanceAdjustmentsModel from "@/server/models/balance-adjustments.model";
import ShareLinksModel from "@/server/models/share-links.model";
import SourcesOfMoneyModel from "@/server/models/sources-of-money.model";
import { ExpensesService } from "@/server/services/expenses.service";
import { SourcesOfMoneyService } from "@/server/services/sources-of-money.service";
import { BalanceAdjustmentKind } from "@/libs/interfaces/balanceAdjustmentsData";
import { SourcesOfMoneyType } from "@/libs/interfaces/sourcesOfMoneyData";
import { call, expectLedgerMatches, makeCategory, makeSource, testAuth, trackedOf } from "./helpers";

const BANK = SourcesOfMoneyType.BANK;
const CARD = SourcesOfMoneyType.CREDIT_CARD;

describe("Nguồn tiền", () => {
    test("tạo: ghi số dư ban đầu loại OPENING và đánh dấu sổ cái đầy đủ", async () => {
        const source = await makeSource({ balance: 250_000 });
        const doc = await SourcesOfMoneyModel.findById(source).lean<{ ledgerCompleteAt?: Date }>();
        expect(doc?.ledgerCompleteAt).toBeInstanceOf(Date);
        expect(await BalanceAdjustmentsModel.countDocuments({ kind: BalanceAdjustmentKind.OPENING, delta: 250_000 })).toBe(1);
        await expectLedgerMatches(source);
    });

    test("tạo với số dư lẻ bị từ chối", async () => {
        const res = await call(SourcesOfMoneyService.createSourcesOfMoney({ name: "X", type: BANK, balance: 10.5 }));
        expect(res.status).toBe(400);
    });

    test("sửa số dư khi DB đã đổi so với lúc mở form: 409", async () => {
        const source = await makeSource({ balance: 100_000 });
        const categoryId = await makeCategory();
        await call(ExpensesService.createExpense({ categoryId, sourceOfMoneyId: source, amount: 10_000 }));

        const res = await call(
            SourcesOfMoneyService.updateSourcesOfMoney(source, { name: "Ngân hàng", type: BANK, balance: 200_000, expectedAmount: 100_000 }),
        );
        expect(res.status).toBe(409);
        expect(await trackedOf(source)).toBe(90_000);
    });

    test("sửa tay số dư: ghi điều chỉnh MANUAL, sổ cái vẫn khớp", async () => {
        const source = await makeSource({ balance: 100_000 });
        const res = await call(
            SourcesOfMoneyService.updateSourcesOfMoney(source, { name: "Ngân hàng", type: BANK, balance: 120_000, expectedAmount: 100_000 }),
        );
        expect(res.status).toBe(200);
        expect(await BalanceAdjustmentsModel.countDocuments({ kind: BalanceAdjustmentKind.MANUAL, delta: 20_000 })).toBe(1);
        await expectLedgerMatches(source);
    });

    test("nguồn cũ đang lưu số lẻ vẫn sửa được tên khi không đổi số", async () => {
        const { insertedId } = await SourcesOfMoneyModel.collection.insertOne({
            userId: new mongoose.Types.ObjectId(testAuth.userId),
            name: "Cũ",
            type: BANK,
            balance: 100.5,
            sortOrder: 0,
            archivedAt: null,
        });
        const res = await call(
            SourcesOfMoneyService.updateSourcesOfMoney(insertedId.toString(), { name: "Mới", type: BANK, balance: 100.5, expectedAmount: 100.5 }),
        );
        expect(res.status).toBe(200);
    });

    test("hạ hạn mức thấp hơn dư nợ: 400", async () => {
        const card = await makeSource({ type: CARD, creditLimit: 1_000_000, currentDebt: 500_000 });
        const res = await call(
            SourcesOfMoneyService.updateSourcesOfMoney(card, {
                name: "Thẻ",
                type: CARD,
                creditDetails: { creditLimit: 400_000, currentDebt: 500_000 },
                expectedAmount: 500_000,
            }),
        );
        expect(res.status).toBe(400);
    });

    test("xóa nguồn chỉ có số dư ban đầu: xóa hẳn, dọn điều chỉnh và link chia sẻ", async () => {
        const source = await makeSource({ balance: 100_000 });
        await ShareLinksModel.create({
            userId: testAuth.userId,
            sourceOfMoneyId: source,
            tokenHash: "x".repeat(64),
            expiresAt: new Date(Date.now() + 86_400_000),
        });
        expect((await call(SourcesOfMoneyService.deleteSourcesOfMoney(source))).status).toBe(200);
        expect(await SourcesOfMoneyModel.countDocuments()).toBe(0);
        expect(await BalanceAdjustmentsModel.countDocuments()).toBe(0);
        expect(await ShareLinksModel.countDocuments()).toBe(0);
    });

    test("nguồn có điều chỉnh tay chỉ được lưu trữ, và phải về 0", async () => {
        const source = await makeSource({ balance: 100_000 });
        await call(
            SourcesOfMoneyService.updateSourcesOfMoney(source, { name: "Ngân hàng", type: BANK, balance: 50_000, expectedAmount: 100_000 }),
        );
        expect((await call(SourcesOfMoneyService.deleteSourcesOfMoney(source))).status).toBe(400);

        await call(
            SourcesOfMoneyService.updateSourcesOfMoney(source, { name: "Ngân hàng", type: BANK, balance: 0, expectedAmount: 50_000 }),
        );
        expect((await call(SourcesOfMoneyService.deleteSourcesOfMoney(source))).status).toBe(200);
        const doc = await SourcesOfMoneyModel.findById(source).lean<{ archivedAt?: Date }>();
        expect(doc?.archivedAt).toBeInstanceOf(Date);
    });
});
