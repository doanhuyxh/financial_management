const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

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
