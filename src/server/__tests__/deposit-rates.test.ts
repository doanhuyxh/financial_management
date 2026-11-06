import { afterEach, describe, expect, test } from "bun:test";
import DepositRateSnapshotsModel from "@/server/models/deposit-rate-snapshots.model";
import { DepositRatesService, refreshAllDepositRates } from "@/server/services/deposit-rates.service";
import { parseHtmlTable } from "@/server/utils/depositRates/html";
import { parseAcb } from "@/server/utils/depositRates/providers/acb";
import { parseVietcombank } from "@/server/utils/depositRates/providers/vietcombank";
import {
    buildDepositRows,
    calcDepositInterest,
    getRate,
} from "@/components/features/deposit-rate-compare/utils";
import { DepositRateOrigin, type IDepositRateTableData } from "@/libs/interfaces/depositRatesData";
import { call, objectId, testAuth } from "./helpers";

// ----- HTML mẫu thu gọn đúng cấu trúc trang thật (06/11/2026)

function vcbHtml(items: object[]) {
    const json = JSON.stringify({ Count: items.length, UpdatedDate: "2026-11-06T16:29:40+07:00", Data: items });
    return `<div class="component deposit-interest-rate-table" data-x="${json.replace(/"/g, "&quot;")}"></div>`;
}
const VCB_HTML = vcbHtml([
    { tenorType: "Savings", tenor: "Demand", currencyCode: "VND", rates: 0.001 },
    { tenorType: "Savings", tenor: "1-months", currencyCode: "VND", rates: 0.021 },
    { tenorType: "Savings", tenor: "6-months", currencyCode: "VND", rates: 0.03 },
    { tenorType: "Savings", tenor: "12-months", currencyCode: "VND", rates: 0.054 },
    { tenorType: "Savings", tenor: "12-months", currencyCode: "USD", rates: 0 },
    { tenorType: "Online", tenor: "1-months", currencyCode: "VND", rates: 0.021 },
    { tenorType: "Online", tenor: "6-months", currencyCode: "VND", rates: 0.03 },
    { tenorType: "Online", tenor: "12-months", currencyCode: "VND", rates: 0.054 },
    { tenorType: "Online", tenor: "24-months", currencyCode: "VND", rates: null },
    { tenorType: "FixedDeposit", tenor: "12-months", currencyCode: "VND", rates: 0.054 },
]);

const ACB_TABLE = `<table border="1"><tbody>
<tr><td>Mức gửi/ TK</td><td colspan="7">Tiền gửi Online (LCK)</td></tr>
<tr><td>(triệu VND)</td><td>1 &ndash; 3 tuần</td><td>1 th&aacute;ng </td><td>2 th&aacute;ng</td><td> 3 th&aacute;ng</td><td>6 th&aacute;ng</td><td>9 th&aacute;ng</td><td>12 th&aacute;ng</td></tr>
<tr><td>&lt; 200 </td><td rowspan="4">0,50</td><td>4,40</td><td>4,40</td><td>4,40</td><td>4,40</td><td>4,60</td><td>5,20</td></tr>
<tr><td>200 &ndash; &lt; 1.000</td><td>4,50</td><td>4,50</td><td>4,50</td><td>4,50</td><td>4,70</td><td>5,30</td></tr>
<tr><td>1.000 - &lt; 5.000 </td><td>4,55</td><td>4,55</td><td>4,55</td><td>4,55</td><td>4,75</td><td>5,35</td></tr>
<tr><td>&gt;= 5.000</td><td>4,60</td><td>4,60</td><td>4,60</td><td>4,60</td><td>4,80</td><td>5,40</td></tr>
</tbody></table>`;
const ACB_PREPAID = ACB_TABLE.replace("Online (LCK)", "Online Lãi trả trước (LCK)");
function acbHtml(tables: string[]) {
    const nextData = { props: { pageProps: { data: [{ name: "DepositInterest", formdata: { list: tables.map((table) => ({ table })) } }] } } };
    return `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify(nextData)}</script>`;
}

describe("Lãi suất — đọc trang ngân hàng", () => {
    test("bảng HTML: trải rowspan/colspan", () => {
        const grid = parseHtmlTable(ACB_TABLE);
        expect(grid[0]).toEqual(["Mức gửi/ TK", ...Array(7).fill("Tiền gửi Online (LCK)")]);
        expect(grid[3][1]).toBe("0,50"); // ô gộp dọc lặp lại ở hàng dưới
        expect(grid[3][2]).toBe("4,50");
    });

    test("Vietcombank: JSON nhúng → online + tại quầy, chỉ VND theo tháng, bỏ rates null", () => {
        const tables = parseVietcombank(VCB_HTML);
        expect(tables).toEqual([
            { productKey: "online", product: "Gửi online", tiers: [{ minAmount: 0, rates: { "1": 2.1, "6": 3, "12": 5.4 } }] },
            { productKey: "counter", product: "Tiết kiệm tại quầy", tiers: [{ minAmount: 0, rates: { "1": 2.1, "6": 3, "12": 5.4 } }] },
        ]);
        expect(() => parseVietcombank("<html></html>")).toThrow();
    });

    test("ACB: bảng online lãi cuối kỳ theo bậc số tiền, bỏ bảng lãi trả trước, bỏ kỳ hạn tuần", () => {
        const [table] = parseAcb(acbHtml([ACB_PREPAID, ACB_TABLE]));
        expect(table.tiers.map((tier) => tier.minAmount)).toEqual([0, 200_000_000, 1_000_000_000, 5_000_000_000]);
        expect(table.tiers[0].rates).toEqual({ "1": 4.4, "2": 4.4, "3": 4.4, "6": 4.4, "9": 4.6, "12": 5.2 });
        expect(table.tiers[3].rates["12"]).toBe(5.4);
        expect(() => parseAcb(acbHtml([ACB_PREPAID]))).toThrow();
    });
});

describe("Lãi suất — tính tiền lãi", () => {
    const table = (id: string, tiers: IDepositRateTableData["tiers"]): IDepositRateTableData => ({
        _id: id,
        origin: DepositRateOrigin.AUTO,
        bankCode: id,
        bankName: id,
        product: "",
        tiers,
        updatedAt: new Date().toISOString(),
    });
    const acb = table("ACB", [
        { minAmount: 0, rates: { "12": 5.2 } },
        { minAmount: 200_000_000, rates: { "12": 5.3 } },
    ]);
    const vcb = table("VCB", [{ minAmount: 0, rates: { "12": 5.4, "24": 5.5 } }]);

    test("lãi đơn cuối kỳ: tiền × %/năm × tháng/12", () => {
        expect(calcDepositInterest(100_000_000, 5.4, 12)).toBe(5_400_000);
        expect(calcDepositInterest(100_000_000, 4.4, 6)).toBe(2_200_000);
    });

    test("chọn bậc theo số tiền; không có kỳ hạn → null", () => {
        expect(getRate(acb, 199_999_999, 12)).toBe(5.2);
        expect(getRate(acb, 200_000_000, 12)).toBe(5.3);
        expect(getRate(acb, 100_000_000, 24)).toBeNull();
    });

    test("xếp hạng: lãi cao trước, tô tốt/kém, ngân hàng thiếu kỳ hạn xuống cuối", () => {
        const rows = buildDepositRows([acb, vcb], { amount: 100_000_000, termMonths: 12 });
        expect(rows.map((row) => [row.table._id, row.interest, row.rank])).toEqual([
            ["VCB", 5_400_000, "best"],
            ["ACB", 5_200_000, "worst"],
        ]);
        const long = buildDepositRows([acb, vcb], { amount: 100_000_000, termMonths: 24 });
        expect(long.map((row) => [row.table._id, row.rate, row.rank])).toEqual([
            ["VCB", 5.5, undefined],
            ["ACB", null, undefined],
        ]);
    });
});

// ----- Service: thay fetch toàn cục bằng trang mẫu

const realFetch = globalThis.fetch;
afterEach(() => {
    globalThis.fetch = realFetch;
});

function stubFetch(handler: (url: string) => { status?: number; body?: string }) {
    let calls = 0;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
        calls += 1;
        const { status = 200, body = "" } = handler(String(input));
        return new Response(body, { status });
    }) as unknown as typeof fetch;
    return () => calls;
}

const bankPages = (url: string) =>
    url.includes("vietcombank") ? { body: VCB_HTML } : { body: acbHtml([ACB_TABLE]) };

describe("Lãi suất — lấy tự động", () => {
    test("lần đầu mở trang: tự lấy, trả 3 bảng tự động; mở lại trong 12 giờ không gọi trang ngân hàng", async () => {
        const calls = stubFetch(bankPages);
        const first = await call(DepositRatesService.getComparison());
        expect(first.status).toBe(200);
        const auto = first.data.tables.filter((table: IDepositRateTableData) => table.origin === DepositRateOrigin.AUTO);
        expect(auto.map((table: IDepositRateTableData) => table._id).sort()).toEqual(["acb:online", "vcb:counter", "vcb:online"]);
        expect(calls()).toBe(2);

        await call(DepositRatesService.getComparison());
        expect(calls()).toBe(2);
    });

    test("trang lỗi: giữ số cũ, ghi lastError; lỗi ngay lần đầu thì có dòng rỗng", async () => {
        stubFetch(bankPages);
        await refreshAllDepositRates();

        stubFetch((url) => (url.includes("vietcombank") ? { status: 503 } : { body: "<html>đổi giao diện</html>" }));
        expect(await refreshAllDepositRates()).toBe(0);
        const vcb = await DepositRateSnapshotsModel.findOne({ key: "vcb:online" }).lean<{ tiers: unknown[]; lastError: string }>();
        expect(vcb?.tiers).toHaveLength(1);
        expect(vcb?.lastError).toContain("503");

        await DepositRateSnapshotsModel.deleteMany({});
        await refreshAllDepositRates();
        const empty = await DepositRateSnapshotsModel.findOne({ key: "acb:online" }).lean<{ tiers: unknown[]; lastError: string | null }>();
        expect(empty?.tiers).toEqual([]);
        expect(empty?.lastError).toBeTruthy();
    });

    test("số đọc được vô lý (lãi > 20%) → coi như lỗi, không ghi đè", async () => {
        stubFetch((url) =>
            url.includes("vietcombank")
                ? { body: vcbHtml([1, 6, 12].map((m) => ({ tenorType: "Online", tenor: `${m}-months`, currencyCode: "VND", rates: 0.54 }))) }
                : { body: acbHtml([ACB_TABLE]) },
        );
        await refreshAllDepositRates();
        const vcb = await DepositRateSnapshotsModel.findOne({ key: "vcb:online" }).lean<{ tiers: unknown[]; lastError: string }>();
        expect(vcb?.tiers).toEqual([]);
        expect(vcb?.lastError).toContain("không hợp lệ");
    });

    test("nút Lấy lại: chạy ngay, bấm tiếp trong 10 phút → 429", async () => {
        stubFetch(bankPages);
        const first = await call(DepositRatesService.refresh());
        expect(first.status).toBe(200);
        expect(first.data).toEqual({ succeeded: 3, total: 3 });
        expect((await call(DepositRatesService.refresh())).status).toBe(429);
    });
});

describe("Lãi suất — tự nhập", () => {
    const body = {
        bankCode: "TCB",
        bankName: "Techcombank",
        product: "Gửi online",
        rates: [
            { termMonths: 6, rate: 4.55 },
            { termMonths: 12, rate: 5.25 },
        ],
    };

    test("thêm, sửa, xóa; chỉ thấy bảng của mình", async () => {
        stubFetch(bankPages);
        const created = await call(DepositRatesService.createManual(body));
        expect(created.status).toBe(200);
        expect(created.data).toMatchObject({
            origin: DepositRateOrigin.MANUAL,
            tiers: [{ minAmount: 0, rates: { "6": 4.55, "12": 5.25 } }],
        });
        const id = created.data._id as string;

        const updated = await call(DepositRatesService.updateManual(id, { ...body, rates: [{ termMonths: 12, rate: 5.3 }] }));
        expect(updated.data.tiers[0].rates).toEqual({ "12": 5.3 });

        // User khác không thấy, không sửa/xóa được
        const ownerId = testAuth.userId;
        testAuth.userId = objectId();
        const others = await call(DepositRatesService.getComparison());
        expect(others.data.tables.some((table: IDepositRateTableData) => table._id === id)).toBe(false);
        expect((await call(DepositRatesService.updateManual(id, body))).status).toBe(404);
        expect((await call(DepositRatesService.deleteManual(id))).status).toBe(404);
        testAuth.userId = ownerId;

        expect((await call(DepositRatesService.deleteManual(id))).status).toBe(200);
        expect((await call(DepositRatesService.deleteManual(id))).status).toBe(404);
    });

    test("dữ liệu sai → 400", async () => {
        for (const bad of [
            { ...body, bankCode: "" },
            { ...body, rates: [] },
            { ...body, rates: [{ termMonths: 12, rate: 0 }] },
            { ...body, rates: [{ termMonths: 12, rate: 25 }] },
            { ...body, rates: [{ termMonths: 0, rate: 5 }] },
            { ...body, product: "x".repeat(61) },
        ]) {
            expect((await call(DepositRatesService.createManual(bad))).status).toBe(400);
        }
    });
});
