import { decodeEntities, parseTermMonths } from "../html";
import { findTermRateTable, ratesFromTermRows } from "./termRows";
import type { IDepositRateProvider, IParsedDepositTable } from "./types";

const SOURCE_URL = "https://www.agribank.com.vn/vn/lai-suat-tien-gui";
const PRODUCT = { productKey: "counter", product: "Tiền gửi cá nhân" };
/** Trang nạp bảng cá nhân bằng `$('.tab1').load('/wcm/connect/.../lai-suat-cn?...&cmpntid=...')`. */
const FRAGMENT_PATTERN = /\$\(\s*['"]\.tab1['"]\s*\)\s*\.load\(\s*['"]([^'"]+)['"]/;

/** Đường dẫn mảnh HTML chứa bảng lãi suất cá nhân, đọc từ trang (tham số `cmpntid` có thể đổi). */
export function agribankFragmentUrl(pageHtml: string): string {
    const path = FRAGMENT_PATTERN.exec(pageHtml)?.[1];
    if (!path) throw new Error("Không thấy đường dẫn bảng lãi suất trên trang Agribank");
    return new URL(decodeEntities(path), SOURCE_URL).toString();
}

/** Mảnh HTML: bảng "Kì hạn | VND | USD | ...", hàng "N Tháng"; bỏ "Không kỳ hạn", "Tiền gửi thanh toán". */
export function parseAgribank(fragmentHtml: string): IParsedDepositTable[] {
    const grid = findTermRateTable(fragmentHtml);
    if (!grid) throw new Error("Không thấy bảng lãi suất trên trang Agribank");
    const rates = ratesFromTermRows(grid, parseTermMonths);
    return [{ ...PRODUCT, tiers: [{ minAmount: 0, rates }] }];
}

export const agribankProvider: IDepositRateProvider = {
    id: "agribank",
    bankCode: "VBA",
    bankName: "Agribank",
    sourceUrl: SOURCE_URL,
    fragmentUrl: agribankFragmentUrl,
    products: [PRODUCT],
    parse: parseAgribank,
};
