import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";
import CardRolloversModel from "@/server/models/card-rollovers.model";
import ExpensesModel from "@/server/models/expenses.model";
import TransfersModel from "@/server/models/transfers.model";
import { CardRolloversService } from "@/server/services/card-rollovers.service";
import { CardFeeType } from "@/libs/interfaces/expensesData";
import { SourcesOfMoneyType } from "@/libs/interfaces/sourcesOfMoneyData";
import { call, expectLedgerMatches, makeCategory, makeSource, trackedOf } from "./helpers";

const CARD = SourcesOfMoneyType.CREDIT_CARD;

afterEach(() => mock.restore());

describe("Đáo hạn thẻ", () => {
    test("có phí: dư nợ chỉ tăng đúng phí, sinh khoản chi ROLLOVER_FEE bị khóa", async () => {
        const card = await makeSource({ type: CARD, creditLimit: 50_000_000, currentDebt: 20_000_000 });
        const feeCategoryId = await makeCategory(undefined, "Phí");

        const res = await call(
            CardRolloversService.createCardRollover({ sourceOfMoneyId: card, amount: 20_000_000, feePercent: 1.8, feeCategoryId }),
        );
        expect(res.status).toBe(200);
        expect(await trackedOf(card)).toBe(20_360_000);
        expect(
            await ExpensesModel.countDocuments({ cardFeeType: CardFeeType.ROLLOVER_FEE, skipBalanceAdjust: true, amount: 360_000 }),
        ).toBe(1);
        await expectLedgerMatches(card);

        expect((await call(CardRolloversService.deleteCardRollover(res.data._id))).status).toBe(200);
        expect(await trackedOf(card)).toBe(20_000_000);
        expect(await ExpensesModel.countDocuments()).toBe(0);
        await expectLedgerMatches(card);
    });

    test("tự trả một phần: tạo transfer trả nợ trước, dư nợ = cũ − x + phí", async () => {
        const card = await makeSource({ type: CARD, creditLimit: 50_000_000, currentDebt: 20_000_000 });
        const bank = await makeSource({ balance: 5_000_000 });
        const feeCategoryId = await makeCategory(undefined, "Phí");

        const res = await call(
            CardRolloversService.createCardRollover({
                sourceOfMoneyId: card,
                amount: 15_000_000,
                feePercent: 2,
                feeCategoryId,
                paymentAmount: 5_000_000,
                paymentSourceId: bank,
            }),
        );
        expect(res.status).toBe(200);
        expect(await trackedOf(card)).toBe(15_300_000);
        expect(await trackedOf(bank)).toBe(0);
        await expectLedgerMatches(card, bank);
    });

    test("lỗi ở bước ghi bản đáo hạn: hoàn phí, xóa khoản phí và transfer tự trả", async () => {
        const card = await makeSource({ type: CARD, creditLimit: 50_000_000, currentDebt: 20_000_000 });
        const bank = await makeSource({ balance: 5_000_000 });
        const feeCategoryId = await makeCategory(undefined, "Phí");
        spyOn(CardRolloversModel, "create").mockImplementationOnce(async () => {
            throw new Error("boom");
        });

        const res = await call(
            CardRolloversService.createCardRollover({
                sourceOfMoneyId: card,
                amount: 15_000_000,
                feePercent: 2,
                feeCategoryId,
                paymentAmount: 5_000_000,
                paymentSourceId: bank,
            }),
        );
        expect(res.status).toBe(400);
        expect(await trackedOf(card)).toBe(20_000_000);
        expect(await trackedOf(bank)).toBe(5_000_000);
        expect(await ExpensesModel.countDocuments()).toBe(0);
        expect(await TransfersModel.countDocuments()).toBe(0);
        await expectLedgerMatches(card, bank);
    });

    test("số đáo hạn lẻ (suy ra từ %) được làm tròn", async () => {
        const card = await makeSource({ type: CARD, creditLimit: 50_000_000, currentDebt: 20_000_000 });
        const res = await call(CardRolloversService.createCardRollover({ sourceOfMoneyId: card, amount: 9_823_182.7 }));
        expect(res.status).toBe(200);
        expect(res.data.amount).toBe(9_823_183);
    });
});
