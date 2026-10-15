export const currencyFormatter = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
});

export const compactFormatter = new Intl.NumberFormat("vi-VN", {
    notation: "compact",
    compactDisplay: "short",
});

export const percentFormatter = new Intl.NumberFormat("vi-VN", {
    style: "percent",
    maximumFractionDigits: 1,
});

export function formatMoney(value?: number | null) {
    if (value == null || Number.isNaN(value)) return "—";
    return currencyFormatter.format(value);
}

export function formatCompactMoney(value: number) {
    return compactFormatter.format(value);
}

export function formatPercent(value: number) {
    return percentFormatter.format(value);
}
