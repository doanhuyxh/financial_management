import { decodeEntities } from "../html";
import type { IDepositRateProvider, IParsedDepositTable } from "./types";

interface VcbRateItem {
    tenorType?: string;
    tenor?: string;
    currencyCode?: string;
    rates?: number | null;
}

const PRODUCTS: Record<string, { productKey: string; product: string }> = {
    Online: { productKey: "online", product: "Gửi online" },
    Savings: { productKey: "counter", product: "Tiết kiệm tại quầy" },
};

/** Trang nhúng JSON `{ Count, UpdatedDate, Data: [{ tenorType, tenor, currencyCode, rates }] }` trong một thuộc tính HTML. */
function extractRateJson(html: string): VcbRateItem[] {
    for (const [, raw] of html.matchAll(/="(\{&quot;Count&quot;[^"]*)"/g)) {
        if (!raw.includes("tenorType")) continue;
        const parsed = JSON.parse(decodeEntities(raw)) as { Data?: VcbRateItem[] };
        if (Array.isArray(parsed.Data)) return parsed.Data;
    }
    throw new Error("Không thấy bảng lãi suất trên trang Vietcombank");
}

export function parseVietcombank(html: string): IParsedDepositTable[] {
    const items = extractRateJson(html);
    const byProduct = new Map<string, Record<string, number>>();
    for (const item of items) {
        const product = item.tenorType ? PRODUCTS[item.tenorType] : undefined;
        const months = /^(\d+)-months$/.exec(item.tenor ?? "")?.[1];
        if (!product || !months || item.currencyCode !== "VND" || typeof item.rates !== "number") continue;
        const rates = byProduct.get(product.productKey) ?? {};
        // `rates` là số thập phân: 0.054 = 5,4%/năm
        rates[months] = Math.round(item.rates * 10_000) / 100;
        byProduct.set(product.productKey, rates);
    }
    return Object.values(PRODUCTS)
        .filter((product) => byProduct.has(product.productKey))
        .map((product) => ({
            ...product,
            tiers: [{ minAmount: 0, rates: byProduct.get(product.productKey)! }],
        }));
}

export const vietcombankProvider: IDepositRateProvider = {
    id: "vcb",
    bankCode: "VCB",
    bankName: "Vietcombank",
    sourceUrl: "https://www.vietcombank.com.vn/vi-VN/KHCN/Cong-cu-tien-ich/KHCN---Lai-suat",
    products: Object.values(PRODUCTS),
    parse: parseVietcombank,
};
