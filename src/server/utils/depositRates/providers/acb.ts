import { htmlToText, parseHtmlTable, parsePercent, parseTermMonths } from "../html";
import type { IDepositRateProvider, IParsedDepositTable } from "./types";

const ONLINE_TABLE_MARKER = "Online (LCK)";
const MILLION = 1_000_000;

/** Lấy mọi chuỗi chứa `<table` trong dữ liệu Next.js của trang (bảng soạn trong CMS). */
function collectTableHtml(value: unknown, out: string[] = []) {
    if (typeof value === "string") {
        if (value.includes("<table")) out.push(...(value.match(/<table[\s\S]*?<\/table>/gi) ?? []));
    } else if (Array.isArray(value)) {
        for (const item of value) collectTableHtml(item, out);
    } else if (value && typeof value === "object") {
        for (const item of Object.values(value)) collectTableHtml(item, out);
    }
    return out;
}

/** "< 200" → 0; "200 – < 1.000" → 200 triệu; ">= 5.000" → 5 tỷ (đơn vị bảng: triệu VND). */
function parseMinAmount(label: string): number | null {
    const text = label.replace(/\s/g, "");
    if (text.startsWith("<")) return 0;
    const match = /(\d[\d.]*)/.exec(text);
    if (!match) return null;
    return Number(match[1].replace(/\./g, "")) * MILLION;
}

/**
 * Bảng "Tiền gửi Online (LCK)" (lãi cuối kỳ): hàng = bậc số tiền (triệu VND), cột = kỳ hạn.
 * Bỏ bảng "kỳ hạn tùy chọn" và "lãi trả trước" (cùng trang, khác cách trả lãi).
 */
export function parseAcb(html: string): IParsedDepositTable[] {
    const nextData = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(html)?.[1];
    if (!nextData) throw new Error("Không thấy dữ liệu trang ACB");
    const tableHtml = collectTableHtml(JSON.parse(nextData)).find((table) => {
        const text = htmlToText(table);
        return text.includes(ONLINE_TABLE_MARKER) && !/tùy chọn|trả trước/i.test(text);
    });
    if (!tableHtml) throw new Error("Không thấy bảng lãi suất online trên trang ACB");

    const grid = parseHtmlTable(tableHtml);
    const headerIndex = grid.findIndex(
        (row) => row.filter((cell) => parseTermMonths(cell) != null).length >= 3,
    );
    if (headerIndex < 0) throw new Error("Không đọc được kỳ hạn trên trang ACB");
    const termByColumn = grid[headerIndex].map((cell) => parseTermMonths(cell));

    const tiers: IParsedDepositTable["tiers"] = [];
    for (const row of grid.slice(headerIndex + 1)) {
        const minAmount = parseMinAmount(row[0] ?? "");
        if (minAmount == null) continue;
        const rates: Record<string, number> = {};
        row.forEach((cell, column) => {
            const months = termByColumn[column];
            const rate = months ? parsePercent(cell) : null;
            if (months && rate != null) rates[String(months)] = rate;
        });
        if (Object.keys(rates).length > 0) tiers.push({ minAmount, rates });
    }
    tiers.sort((a, b) => a.minAmount - b.minAmount);
    return [{ productKey: "online", product: "Gửi online", tiers }];
}

export const acbProvider: IDepositRateProvider = {
    id: "acb",
    bankCode: "ACB",
    bankName: "ACB",
    sourceUrl: "https://acb.com.vn/lai-suat-tien-gui",
    products: [{ productKey: "online", product: "Gửi online" }],
    parse: parseAcb,
};
