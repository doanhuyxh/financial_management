import { parseTermMonths } from "../html";
import type { IDepositRateProvider, IParsedDepositTable } from "./types";

const PRODUCT = { productKey: "listed", product: "Lãi suất niêm yết" };
const UNIT_VND: Record<string, number> = { tỷ: 1_000_000_000, ty: 1_000_000_000, triệu: 1_000_000, trieu: 1_000_000 };

/** JSON trang vpbank.com.vn/ty-gia gọi: cột = kỳ hạn, hàng = bậc số tiền, `data[hàng][cột]` = %/năm. */
interface VpbankRateJson {
    columns?: string[];
    rows?: string[];
    data?: (number | null)[][];
}

/** "<1 tỷ" → 0; "1 tỷ -3 tỷ" → 1 tỷ; "3 tỷ - < 10 tỷ" → 3 tỷ; ">= 50 tỷ" → 50 tỷ; "500 triệu - < 1 tỷ" → 500 triệu. */
export function parseVpbankMinAmount(label: string): number | null {
    const text = label.toLowerCase().replace(/\s+/g, "");
    if (text.startsWith("<")) return 0;
    const match = /(\d+(?:[.,]\d+)?)(tỷ|ty|triệu|trieu)/.exec(text);
    if (!match) return null;
    return Math.round(Number(match[1].replace(",", ".")) * UNIT_VND[match[2]]);
}

export function parseVpbank(jsonText: string): IParsedDepositTable[] {
    let parsed: VpbankRateJson;
    try {
        parsed = JSON.parse(jsonText) as VpbankRateJson;
    } catch {
        throw new Error("Dữ liệu lãi suất VPBank không phải JSON");
    }
    const { columns, rows, data } = parsed;
    if (!Array.isArray(columns) || !Array.isArray(rows) || !Array.isArray(data)) {
        throw new Error("Dữ liệu lãi suất VPBank đổi cấu trúc");
    }
    const termByColumn = columns.map((label) => parseTermMonths(String(label)));
    const tiers: IParsedDepositTable["tiers"] = [];
    rows.forEach((label, rowIndex) => {
        const minAmount = parseVpbankMinAmount(String(label));
        const values = data[rowIndex];
        if (minAmount == null || !Array.isArray(values)) return;
        const rates: Record<string, number> = {};
        termByColumn.forEach((months, column) => {
            const rate = values[column];
            if (months && typeof rate === "number" && rate > 0) rates[String(months)] = rate;
        });
        if (Object.keys(rates).length > 0) tiers.push({ minAmount, rates });
    });
    tiers.sort((a, b) => a.minAmount - b.minAmount);
    return [{ ...PRODUCT, tiers }];
}

export const vpbankProvider: IDepositRateProvider = {
    id: "vpbank",
    bankCode: "VPB",
    bankName: "VPBank",
    sourceUrl: "https://www.vpbank.com.vn/ty-gia",
    fetchUrl: "https://www.vpbank.com.vn/uiux-api/api/interest-rate",
    products: [PRODUCT],
    parse: parseVpbank,
};
