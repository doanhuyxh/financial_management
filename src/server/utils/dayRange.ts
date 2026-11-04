const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Chuỗi YYYY-MM-DD hợp lệ thì trả lại, ngược lại undefined. */
export function normalizeDay(value: unknown): string | undefined {
    if (typeof value !== "string" || !DAY_PATTERN.test(value)) return undefined;
    const date = new Date(`${value}T00:00:00.000+07:00`);
    return Number.isNaN(date.getTime()) ? undefined : value;
}

/** Điều kiện ngày cho Mongo: from 00:00, to 23:59:59.999, theo giờ VN (+07:00). */
export function buildDayRange(from?: string, to?: string) {
    const range: { $gte?: Date; $lte?: Date } = {};
    if (from) range.$gte = new Date(`${from}T00:00:00.000+07:00`);
    if (to) range.$lte = new Date(`${to}T23:59:59.999+07:00`);
    return range.$gte || range.$lte ? range : undefined;
}

/** Đầu ngày giờ VN chứa thời điểm `date`. */
export function startOfVietnamDay(date: Date) {
    const shifted = date.getTime() + VN_OFFSET_MS;
    return new Date(shifted - (((shifted % DAY_MS) + DAY_MS) % DAY_MS) - VN_OFFSET_MS);
}

/** Nhận YYYY-MM-DD hoặc chuỗi ISO, trả ngày YYYY-MM-DD theo giờ VN; sai thì undefined. */
function toVietnamDay(value: unknown): string | undefined {
    const day = normalizeDay(value);
    if (day) return day;
    if (typeof value !== "string" || !value) return undefined;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return undefined;
    return new Date(startOfVietnamDay(date).getTime() + VN_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * Bộ lọc `from`/`to` của các danh sách giao dịch: nhận YYYY-MM-DD hoặc ISO (client cũ gửi
 * `startOf/endOf("day").toISOString()`), luôn quy về cả ngày theo giờ VN, không phụ thuộc TZ server.
 */
export function buildListDateRange(from?: unknown, to?: unknown) {
    return buildDayRange(toVietnamDay(from), toVietnamDay(to));
}

/** Ngày DD/MM/YYYY theo giờ VN (dùng trong thông báo lỗi phía server, không phụ thuộc TZ server). */
export function formatVietnamDay(date: Date) {
    const [year, month, day] = new Date(startOfVietnamDay(date).getTime() + VN_OFFSET_MS)
        .toISOString()
        .slice(0, 10)
        .split("-");
    return `${day}/${month}/${year}`;
}
