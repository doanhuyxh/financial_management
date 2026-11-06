import { parseHtmlTable, parsePercent } from "../html";

const VND_CELL = /\bVND\b/i;
const TERM_HEADER = /k[ỳì] hạn/i;

/** Bảng đầu tiên trong trang có hàng tiêu đề "Kỳ hạn | VND | ..." (hàng = kỳ hạn, cột = loại tiền). */
export function findTermRateTable(html: string): string[][] | null {
    for (const tableHtml of html.match(/<table[\s>][\s\S]*?<\/table>/gi) ?? []) {
        const grid = parseHtmlTable(tableHtml);
        const header = grid.find((row) => row.some((cell) => VND_CELL.test(cell)));
        if (header && TERM_HEADER.test(header[0]?.normalize("NFC") ?? "")) return grid;
    }
    return null;
}

/** Lấy cột VND của bảng "hàng = kỳ hạn": `parseTerm` đổi nhãn hàng thành số tháng (null = bỏ hàng). */
export function ratesFromTermRows(
    grid: string[][],
    parseTerm: (label: string) => number | null,
): Record<string, number> {
    const headerIndex = grid.findIndex((row) => row.some((cell) => VND_CELL.test(cell)));
    if (headerIndex < 0) throw new Error("Không thấy cột VND");
    const vndColumn = grid[headerIndex].findIndex((cell) => VND_CELL.test(cell));
    const rates: Record<string, number> = {};
    for (const row of grid.slice(headerIndex + 1)) {
        const months = parseTerm((row[0] ?? "").normalize("NFC"));
        const rate = months ? parsePercent(row[vndColumn] ?? "") : null;
        // 0% (không nhận gửi kỳ hạn đó) coi như không có
        if (months && rate != null && rate > 0) rates[String(months)] = rate;
    }
    return rates;
}
