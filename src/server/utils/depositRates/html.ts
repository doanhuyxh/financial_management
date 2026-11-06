/** Đọc HTML tối thiểu cho bộ lấy lãi suất (repo không có thư viện parse HTML; bảng ngân hàng đơn giản). */

const NAMED_ENTITIES: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
    ndash: "–",
    mdash: "—",
    aacute: "á",
    agrave: "à",
    acirc: "â",
    atilde: "ã",
    eacute: "é",
    egrave: "è",
    ecirc: "ê",
    iacute: "í",
    igrave: "ì",
    oacute: "ó",
    ograve: "ò",
    ocirc: "ô",
    otilde: "õ",
    uacute: "ú",
    ugrave: "ù",
    yacute: "ý",
    Aacute: "Á",
    Agrave: "À",
    Acirc: "Â",
    Eacute: "É",
    Ecirc: "Ê",
    Oacute: "Ó",
    Ocirc: "Ô",
    Uacute: "Ú",
};

export function decodeEntities(text: string) {
    return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
        if (entity[0] === "#") {
            const code =
                entity[1] === "x" || entity[1] === "X"
                    ? parseInt(entity.slice(2), 16)
                    : parseInt(entity.slice(1), 10);
            return Number.isFinite(code) ? String.fromCodePoint(code) : match;
        }
        return NAMED_ENTITIES[entity] ?? match;
    });
}

/** Chữ trong một đoạn HTML: bỏ thẻ, giải mã entity, gộp khoảng trắng. */
export function htmlToText(fragment: string) {
    return decodeEntities(fragment.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, " "))
        .replace(/\s+/g, " ")
        .trim();
}

function spanOf(attrs: string, name: "rowspan" | "colspan") {
    const match = new RegExp(`${name}\\s*=\\s*["']?(\\d+)`, "i").exec(attrs);
    const value = match ? Number(match[1]) : 1;
    return value >= 1 && value <= 50 ? value : 1;
}

/**
 * Bảng HTML → lưới chữ, trải `rowspan`/`colspan` ra mọi ô mà chúng phủ
 * (ô gộp dọc lặp lại giá trị ở các hàng dưới). Không hỗ trợ bảng lồng nhau.
 */
export function parseHtmlTable(tableHtml: string): string[][] {
    const grid: string[][] = [];
    const rows = tableHtml.match(/<tr[\s>][\s\S]*?<\/tr>/gi) ?? [];
    rows.forEach((rowHtml, rowIndex) => {
        grid[rowIndex] ??= [];
        let column = 0;
        const cells = rowHtml.matchAll(/<t([dh])([^>]*)>([\s\S]*?)<\/t\1>/gi);
        for (const [, , attrs, inner] of cells) {
            while (grid[rowIndex][column] !== undefined) column += 1;
            const text = htmlToText(inner);
            const rowSpan = spanOf(attrs, "rowspan");
            const colSpan = spanOf(attrs, "colspan");
            for (let r = 0; r < rowSpan; r += 1) {
                const target = (grid[rowIndex + r] ??= []);
                for (let c = 0; c < colSpan; c += 1) target[column + c] = text;
            }
            column += colSpan;
        }
    });
    return grid.map((row) => Array.from(row, (cell) => cell ?? ""));
}

/** "4,40" / "4.4" / "4,40%" → 4.4; không phải số → null. */
export function parsePercent(text: string): number | null {
    const match = /(\d+(?:[.,]\d+)?)/.exec(text.replace(/\s/g, ""));
    if (!match) return null;
    const value = Number(match[1].replace(",", "."));
    return Number.isFinite(value) ? value : null;
}

/** "12 tháng" / "12T" → 12; "1 – 3 tuần", "Không kỳ hạn" → null. */
export function parseTermMonths(text: string): number | null {
    const normalized = text.toLowerCase();
    if (/tuần|ngày|không/.test(normalized)) return null;
    const match = /(\d{1,2})\s*(?:tháng|th|t\b)/.exec(normalized);
    return match ? Number(match[1]) : null;
}
