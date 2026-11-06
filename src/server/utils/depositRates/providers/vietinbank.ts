import { findTermRateTable, ratesFromTermRows } from "./termRows";
import type { IDepositRateProvider, IParsedDepositTable } from "./types";

const PRODUCT = { productKey: "counter", product: "Tiết kiệm tại quầy" };

/**
 * Nhãn hàng là khoảng kỳ hạn: "12 tháng" → 12; "Từ 6 tháng đến dưới 7 tháng" → 6 (từ 6 trở lên);
 * "Trên 12 tháng đến 13 tháng" → 13. Bỏ "Không kỳ hạn", "Dưới 1 tháng", "Trên 36 tháng"
 * và "Trên 13 tháng đến dưới 18 tháng" (14–17, không có kỳ hạn chuẩn).
 */
export function parseVietinbankTerm(label: string): number | null {
    const text = label.toLowerCase().replace(/\s+/g, " ").trim();
    const from = /^(\d{1,3}) tháng$/.exec(text) ?? /^từ (\d{1,3}) tháng/.exec(text);
    if (from) return Number(from[1]);
    const upTo = /^trên \d{1,3} tháng đến (\d{1,3}) tháng$/.exec(text);
    return upTo ? Number(upTo[1]) : null;
}

/** Bảng "LÃI SUẤT HUY ĐỘNG ĐỐI VỚI CÁC KỲ HẠN": hàng = khoảng kỳ hạn, cột = VND/USD/EUR (HTML tĩnh). */
export function parseVietinbank(html: string): IParsedDepositTable[] {
    const grid = findTermRateTable(html);
    if (!grid) throw new Error("Không thấy bảng lãi suất trên trang VietinBank");
    const rates = ratesFromTermRows(grid, parseVietinbankTerm);
    return [{ ...PRODUCT, tiers: [{ minAmount: 0, rates }] }];
}

export const vietinbankProvider: IDepositRateProvider = {
    id: "vietinbank",
    bankCode: "ICB",
    bankName: "VietinBank",
    sourceUrl: "https://www.vietinbank.vn/ca-nhan/cong-cu-tien-ich/lai-suat-khcn",
    products: [PRODUCT],
    parse: parseVietinbank,
};
