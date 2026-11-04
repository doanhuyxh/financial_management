import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from "bun:test";
import mongoose from "mongoose";
import UserModel from "@/server/models/users.model";
import ExpensesModel from "@/server/models/expenses.model";
import TransactionAuditsModel from "@/server/models/transaction-audits.model";
import { ExpensesService } from "@/server/services/expenses.service";
import { IncomesService } from "@/server/services/incomes.service";
import { TransfersService } from "@/server/services/transfers.service";
import { CardRolloversService } from "@/server/services/card-rollovers.service";
import { SettingsService, parseLedgerLock } from "@/server/services/settings.service";
import { TransactionAuditsService } from "@/server/services/transaction-audits.service";
import { CategoryKind } from "@/libs/interfaces/categoriesData";
import { SourcesOfMoneyType } from "@/libs/interfaces/sourcesOfMoneyData";
import {
    TransactionAuditAction,
    TransactionAuditKind,
} from "@/libs/interfaces/transactionAuditsData";
import { call, expectLedgerMatches, makeCategory, makeSource, testAuth, trackedOf } from "./helpers";

const DAY_MS = 24 * 60 * 60 * 1000;

/** YYYY-MM-DD (giờ VN) của ngày cách hôm nay `daysAgo` ngày. */
function vnDay(daysAgo: number) {
    return new Date(Date.now() - daysAgo * DAY_MS + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
/** Giữa trưa giờ VN của ngày cách hôm nay `daysAgo` ngày (ISO). */
const noonOf = (daysAgo: number) => `${vnDay(daysAgo)}T12:00:00.000+07:00`;

const LOCK_DAYS_AGO = 10;
const LOCKED = noonOf(20);
const OPEN = noonOf(5);

async function lockLedger(day: string | null = vnDay(LOCK_DAYS_AGO)) {
    const res = await call(SettingsService.updateSettings({ ledgerLockedBefore: day }));
    expect(res.status).toBe(200);
    return res;
}

beforeEach(async () => {
    await UserModel.create({ _id: new mongoose.Types.ObjectId(testAuth.userId) });
});
afterEach(() => mock.restore());

describe("Khóa sổ — cài đặt", () => {
    test("đặt, đọc lại và bỏ khóa", async () => {
        const set = await lockLedger();
        expect(set.data.ledgerLockedBefore).toBe(
            new Date(`${vnDay(LOCK_DAYS_AGO)}T00:00:00.000+07:00`).toISOString(),
        );
        expect((await call(SettingsService.getSettings())).data.ledgerLockedBefore).toBe(
            set.data.ledgerLockedBefore,
        );
        expect((await lockLedger(null)).data.ledgerLockedBefore).toBeNull();
    });

    test("kiểm tra đầu vào", () => {
        expect(parseLedgerLock("")).toBeNull();
        expect(() => parseLedgerLock("05/11/2026")).toThrow("không hợp lệ");
        expect(() => parseLedgerLock("1999-12-31")).toThrow("trước năm 2000");
        const now = new Date("2026-11-04T10:00:00.000+07:00");
        expect(parseLedgerLock("2026-11-05", now)?.toISOString()).toBe("2026-11-04T17:00:00.000Z");
        expect(() => parseLedgerLock("2026-11-06", now)).toThrow("tới hết hôm nay");
    });
});

describe("Khóa sổ — chặn giao dịch trước mốc", () => {
    test("chi tiêu: tạo/sửa/xóa trong kỳ khóa bị 400, số dư không đổi", async () => {
        const source = await makeSource({ balance: 1_000_000 });
        const categoryId = await makeCategory();
        const old = await call(
            ExpensesService.createExpense({ categoryId, sourceOfMoneyId: source, amount: 100_000, spentAt: LOCKED }),
        );
        expect(old.status).toBe(200);
        await lockLedger();

        const create = await call(
            ExpensesService.createExpense({ categoryId, sourceOfMoneyId: source, amount: 50_000, spentAt: LOCKED }),
        );
        expect(create.status).toBe(400);
        expect(create.body.message).toContain("Kỳ đã khóa sổ");

        const update = await call(
            ExpensesService.updateExpense(old.data._id, { categoryId, sourceOfMoneyId: source, amount: 120_000, spentAt: OPEN }),
        );
        expect(update.status).toBe(400);
        expect((await call(ExpensesService.deleteExpense(old.data._id))).status).toBe(400);

        // Giao dịch mở không được dời vào kỳ đã khóa
        const open = await call(
            ExpensesService.createExpense({ categoryId, sourceOfMoneyId: source, amount: 30_000, spentAt: OPEN }),
        );
        expect(open.status).toBe(200);
        const moveIn = await call(
            ExpensesService.updateExpense(open.data._id, { categoryId, sourceOfMoneyId: source, amount: 30_000, spentAt: LOCKED }),
        );
        expect(moveIn.status).toBe(400);

        expect(await trackedOf(source)).toBe(870_000);
        expect(await ExpensesModel.countDocuments()).toBe(2);
        await expectLedgerMatches(source);
    });

    test("thu nhập và chuyển tiền trong kỳ khóa bị chặn; bỏ khóa thì làm được", async () => {
        const bank = await makeSource({ balance: 500_000 });
        const wallet = await makeSource({ balance: 0, name: "Ví" });
        const incomeCategory = await makeCategory(CategoryKind.INCOME, "Lương");
        const income = await call(
            IncomesService.createIncome({ categoryId: incomeCategory, sourceOfMoneyId: bank, amount: 200_000, receivedAt: LOCKED }),
        );
        const transfer = await call(
            TransfersService.createTransfer({ fromSourceId: bank, toSourceId: wallet, amount: 100_000, transferredAt: LOCKED }),
        );
        expect([income.status, transfer.status]).toEqual([200, 200]);
        await lockLedger();

        expect((await call(IncomesService.deleteIncome(income.data._id))).status).toBe(400);
        expect((await call(TransfersService.deleteTransfer(transfer.data._id))).status).toBe(400);
        const newTransfer = await call(
            TransfersService.createTransfer({ fromSourceId: bank, toSourceId: wallet, amount: 1_000, transferredAt: LOCKED }),
        );
        expect(newTransfer.status).toBe(400);
        expect([await trackedOf(bank), await trackedOf(wallet)]).toEqual([600_000, 100_000]);

        await lockLedger(null);
        expect((await call(TransfersService.deleteTransfer(transfer.data._id))).status).toBe(200);
        expect((await call(IncomesService.deleteIncome(income.data._id))).status).toBe(200);
        expect([await trackedOf(bank), await trackedOf(wallet)]).toEqual([500_000, 0]);
        await expectLedgerMatches(bank, wallet);
    });

    test("đáo hạn ngày trong kỳ khóa bị chặn trước khi đụng dư nợ", async () => {
        const card = await makeSource({ type: SourcesOfMoneyType.CREDIT_CARD, creditLimit: 50_000_000, currentDebt: 10_000_000 });
        const feeCategoryId = await makeCategory(undefined, "Phí");
        await lockLedger();

        const res = await call(
            CardRolloversService.createCardRollover({
                sourceOfMoneyId: card,
                amount: 10_000_000,
                feePercent: 2,
                feeCategoryId,
                rolledAt: LOCKED,
            }),
        );
        expect(res.status).toBe(400);
        expect(res.body.message).toContain("Kỳ đã khóa sổ");
        expect(await trackedOf(card)).toBe(10_000_000);
    });

    test("user chưa đặt khóa: không chặn", async () => {
        const source = await makeSource({ balance: 100_000 });
        const categoryId = await makeCategory();
        const res = await call(
            ExpensesService.createExpense({ categoryId, sourceOfMoneyId: source, amount: 10_000, spentAt: LOCKED }),
        );
        expect(res.status).toBe(200);
    });
});

describe("Lịch sử sửa/xóa", () => {
    test("sửa và xóa chi tiêu ghi before/after; danh sách trả tên nguồn, danh mục", async () => {
        const bank = await makeSource({ balance: 1_000_000, name: "VCB" });
        const wallet = await makeSource({ balance: 1_000_000, name: "Ví" });
        const categoryId = await makeCategory(CategoryKind.EXPENSE, "Ăn uống");
        const created = await call(
            ExpensesService.createExpense({ categoryId, sourceOfMoneyId: bank, amount: 100_000, note: "cơm", spentAt: OPEN }),
        );
        expect(await TransactionAuditsModel.countDocuments()).toBe(0);

        expect(
            (await call(
                ExpensesService.updateExpense(created.data._id, {
                    categoryId,
                    sourceOfMoneyId: wallet,
                    amount: 120_000,
                    note: "cơm tối",
                    spentAt: OPEN,
                }),
            )).status,
        ).toBe(200);
        expect((await call(ExpensesService.deleteExpense(created.data._id))).status).toBe(200);

        const list = await call(TransactionAuditsService.getTransactionAudits({}));
        expect(list.status).toBe(200);
        const [deleted, updated] = list.data.items;
        expect(updated).toMatchObject({
            kind: TransactionAuditKind.EXPENSE,
            action: TransactionAuditAction.UPDATE,
            before: { amount: 100_000, note: "cơm", sourceOfMoneyId: bank, categoryId },
            after: { amount: 120_000, note: "cơm tối", sourceOfMoneyId: wallet },
        });
        expect(updated.before.date).toBe(new Date(OPEN).toISOString());
        expect(deleted).toMatchObject({
            action: TransactionAuditAction.DELETE,
            before: { amount: 120_000, sourceOfMoneyId: wallet },
            after: null,
        });
        expect(list.data.names).toMatchObject({ [bank]: "VCB", [wallet]: "Ví", [categoryId]: "Ăn uống" });

        const onlyIncome = await call(
            TransactionAuditsService.getTransactionAudits({ kind: TransactionAuditKind.INCOME }),
        );
        expect(onlyIncome.data.items).toHaveLength(0);
    });

    test("thao tác thất bại không ghi lịch sử; xóa chuyển tiền và đáo hạn có ghi", async () => {
        const bank = await makeSource({ balance: 100_000 });
        const card = await makeSource({ type: SourcesOfMoneyType.CREDIT_CARD, creditLimit: 50_000_000, currentDebt: 10_000_000 });
        const categoryId = await makeCategory();
        const feeCategoryId = await makeCategory(undefined, "Phí");
        const expense = await call(
            ExpensesService.createExpense({ categoryId, sourceOfMoneyId: bank, amount: 50_000, spentAt: OPEN }),
        );
        const tooMuch = await call(
            ExpensesService.updateExpense(expense.data._id, { categoryId, sourceOfMoneyId: bank, amount: 500_000, spentAt: OPEN }),
        );
        expect(tooMuch.status).toBe(400);
        expect(await TransactionAuditsModel.countDocuments()).toBe(0);

        const rollover = await call(
            CardRolloversService.createCardRollover({
                sourceOfMoneyId: card,
                amount: 8_000_000,
                feePercent: 2,
                feeCategoryId,
                paymentAmount: 50_000,
                paymentSourceId: bank,
                rolledAt: OPEN,
            }),
        );
        expect(rollover.status).toBe(200);
        expect(
            (await call(CardRolloversService.deleteCardRollover(rollover.data._id, { deletePayment: true }))).status,
        ).toBe(200);
        const kinds = (await TransactionAuditsModel.find().lean())
            .map((item) => `${item.kind}:${item.action}`)
            .sort();
        expect(kinds).toEqual(["CARD_ROLLOVER:DELETE", "TRANSFER:DELETE"]);
        await expectLedgerMatches(bank, card);
    });

    test("ghi lịch sử lỗi thì thao tác chính vẫn thành công", async () => {
        const bank = await makeSource({ balance: 100_000 });
        const categoryId = await makeCategory();
        const expense = await call(
            ExpensesService.createExpense({ categoryId, sourceOfMoneyId: bank, amount: 10_000, spentAt: OPEN }),
        );
        spyOn(TransactionAuditsModel, "create").mockRejectedValueOnce(new Error("db down"));
        const warn = spyOn(console, "warn").mockImplementation(() => {});

        expect((await call(ExpensesService.deleteExpense(expense.data._id))).status).toBe(200);
        expect(warn).toHaveBeenCalled();
        expect(await trackedOf(bank)).toBe(100_000);
    });
});
