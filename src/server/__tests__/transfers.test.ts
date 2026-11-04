import { describe, expect, test } from "bun:test";
import ExpensesModel from "@/server/models/expenses.model";
import SourcesOfMoneyModel from "@/server/models/sources-of-money.model";
import { ExpensesService } from "@/server/services/expenses.service";
import { TransfersService } from "@/server/services/transfers.service";
import { SourcesOfMoneyType } from "@/libs/interfaces/sourcesOfMoneyData";
import { call, expectLedgerMatches, makeCategory, makeSource, trackedOf } from "./helpers";

const CARD = SourcesOfMoneyType.CREDIT_CARD;

describe("Chuyển tiền", () => {
    test("thường → thường: không cho phí", async () => {
        const a = await makeSource({ balance: 100_000, name: "A" });
        const b = await makeSource({ name: "B" });
        const fee = await call(TransfersService.createTransfer({ fromSourceId: a, toSourceId: b, amount: 10_000, feePercent: 1 }));
        expect(fee.status).toBe(400);
        const ok = await call(TransfersService.createTransfer({ fromSourceId: a, toSourceId: b, amount: 10_000 }));
        expect(ok.status).toBe(200);
        expect([await trackedOf(a), await trackedOf(b)]).toEqual([90_000, 10_000]);
        await expectLedgerMatches(a, b);
    });

    test("thường → thẻ: giảm dư nợ, không vượt dư nợ", async () => {
        const bank = await makeSource({ balance: 1_000_000 });
        const card = await makeSource({ type: CARD, currentDebt: 300_000 });
        expect((await call(TransfersService.createTransfer({ fromSourceId: bank, toSourceId: card, amount: 300_001 }))).status).toBe(400);
        expect((await call(TransfersService.createTransfer({ fromSourceId: bank, toSourceId: card, amount: 300_000 }))).status).toBe(200);
        expect(await trackedOf(card)).toBe(0);
        await expectLedgerMatches(bank, card);
    });

    test("thẻ → thường có phí tối thiểu: dư nợ tăng đủ, bên nhận nhận amount − phí", async () => {
        const card = await makeSource({ type: CARD, creditLimit: 10_000_000 });
        await SourcesOfMoneyModel.updateOne({ _id: card }, { $set: { "creditDetails.cashAdvanceFeeMin": 50_000 } });
        const bank = await makeSource();
        const feeCategoryId = await makeCategory(undefined, "Phí");

        const noCategory = await call(TransfersService.createTransfer({ fromSourceId: card, toSourceId: bank, amount: 1_000_000, feePercent: 2 }));
        expect(noCategory.status).toBe(400);

        const res = await call(
            TransfersService.createTransfer({ fromSourceId: card, toSourceId: bank, amount: 1_000_000, feePercent: 2, feeCategoryId }),
        );
        expect(res.status).toBe(200);
        expect(res.data.feeAmount).toBe(50_000);
        expect(await trackedOf(card)).toBe(1_000_000);
        expect(await trackedOf(bank)).toBe(950_000);
        expect(await ExpensesModel.countDocuments({ skipBalanceAdjust: true, amount: 50_000 })).toBe(1);
        await expectLedgerMatches(card, bank);
    });

    test("thẻ → thẻ bị chặn", async () => {
        const a = await makeSource({ type: CARD, name: "A" });
        const b = await makeSource({ type: CARD, currentDebt: 100_000, name: "B" });
        expect((await call(TransfersService.createTransfer({ fromSourceId: a, toSourceId: b, amount: 10_000 }))).status).toBe(400);
    });

    test("xóa khi bên nhận đã tiêu: 400, hai bên giữ nguyên", async () => {
        const a = await makeSource({ balance: 100_000, name: "A" });
        const b = await makeSource({ name: "B" });
        const categoryId = await makeCategory();
        const transfer = await call(TransfersService.createTransfer({ fromSourceId: a, toSourceId: b, amount: 50_000 }));
        await call(ExpensesService.createExpense({ categoryId, sourceOfMoneyId: b, amount: 30_000 }));

        expect((await call(TransfersService.deleteTransfer(transfer.data._id))).status).toBe(400);
        expect([await trackedOf(a), await trackedOf(b)]).toEqual([50_000, 20_000]);
        await expectLedgerMatches(a, b);
    });

    test("xóa có phí: hoàn hai bên, xóa khoản phí", async () => {
        const card = await makeSource({ type: CARD, creditLimit: 10_000_000 });
        const bank = await makeSource();
        const feeCategoryId = await makeCategory(undefined, "Phí");
        const transfer = await call(
            TransfersService.createTransfer({ fromSourceId: card, toSourceId: bank, amount: 1_000_000, feePercent: 2, feeCategoryId }),
        );
        expect((await call(TransfersService.deleteTransfer(transfer.data._id))).status).toBe(200);
        expect([await trackedOf(card), await trackedOf(bank)]).toEqual([0, 0]);
        expect(await ExpensesModel.countDocuments()).toBe(0);
        await expectLedgerMatches(card, bank);
    });

    test("số tiền lẻ bị từ chối", async () => {
        const a = await makeSource({ balance: 100_000, name: "A" });
        const b = await makeSource({ name: "B" });
        expect((await call(TransfersService.createTransfer({ fromSourceId: a, toSourceId: b, amount: 10.5 }))).status).toBe(400);
    });
});
