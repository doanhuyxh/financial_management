import { describe, expect, test } from "bun:test";
import { MAX_MONEY, parseMoney } from "@/server/utils/money";
import { parseTransactionDate } from "@/server/utils/transactionDate";
import { buildListDateRange } from "@/server/utils/dayRange";
import { ExpensesService } from "@/server/services/expenses.service";
import { call, makeCategory, makeSource } from "./helpers";

describe("parseMoney", () => {
    test("nhận số nguyên trong khoảng", () => {
        expect(parseMoney(1, "Số tiền")).toBe(1);
        expect(parseMoney("250000", "Số tiền")).toBe(250_000);
        expect(parseMoney(MAX_MONEY, "Số tiền")).toBe(MAX_MONEY);
        expect(parseMoney(0, "Số dư", { allowZero: true })).toBe(0);
        expect(parseMoney(10.6, "Phí", { round: true })).toBe(11);
    });
    test("từ chối số lẻ, âm, 0, vượt trần, rỗng", () => {
        expect(() => parseMoney(10.5, "Số tiền")).toThrow("số nguyên");
        expect(() => parseMoney(-1, "Số tiền")).toThrow();
        expect(() => parseMoney(0, "Số tiền")).toThrow();
        expect(() => parseMoney(MAX_MONEY + 1, "Số tiền")).toThrow();
        expect(() => parseMoney("", "Số tiền")).toThrow("không hợp lệ");
    });
});

describe("parseTransactionDate", () => {
    const now = new Date("2026-11-04T10:00:00+07:00");
    test("bỏ trống là bây giờ; cho phép tới 1 ngày sau", () => {
        expect(parseTransactionDate(undefined, "Ngày", now)).toBe(now);
        expect(parseTransactionDate("2026-11-05T09:00:00+07:00", "Ngày", now)).toBeInstanceOf(Date);
    });
    test("từ chối ngày sai, trước 2000, quá xa tương lai", () => {
        expect(() => parseTransactionDate("x", "Ngày", now)).toThrow();
        expect(() => parseTransactionDate("1999-12-31", "Ngày", now)).toThrow();
        expect(() => parseTransactionDate("2026-11-06T12:00:00+07:00", "Ngày", now)).toThrow();
    });
});

describe("buildListDateRange", () => {
    test("YYYY-MM-DD và ISO của trình duyệt giờ VN cho cùng một khoảng", () => {
        const expected = {
            $gte: new Date("2026-11-04T00:00:00.000+07:00"),
            $lte: new Date("2026-11-04T23:59:59.999+07:00"),
        };
        expect(buildListDateRange("2026-11-04", "2026-11-04")).toEqual(expected);
        expect(buildListDateRange("2026-11-03T17:00:00.000Z", "2026-11-04T16:59:59.999Z")).toEqual(expected);
    });

    test("khoản chi 23:30 giờ VN vẫn nằm trong bộ lọc cùng ngày", async () => {
        const source = await makeSource({ balance: 100_000 });
        const categoryId = await makeCategory();
        await call(
            ExpensesService.createExpense({ categoryId, sourceOfMoneyId: source, amount: 1_000, spentAt: "2025-03-10T23:30:00+07:00" }),
        );
        const res = await call(ExpensesService.getExpenses({ from: "2025-03-10", to: "2025-03-10" }));
        expect(res.data.items).toHaveLength(1);
    });
});
