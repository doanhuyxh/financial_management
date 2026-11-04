const DAY_MS = 24 * 60 * 60 * 1000;
/** Ngày giao dịch sớm nhất chấp nhận (giờ VN). */
export const MIN_TRANSACTION_DATE = new Date("2000-01-01T00:00:00.000+07:00");
/** Cho phép ghi trước tối đa 1 ngày (lệch múi giờ, ghi giao dịch tối nay cho sáng mai). */
const MAX_FUTURE_MS = DAY_MS;

/**
 * Ngày của giao dịch (spentAt, receivedAt, transferredAt, rolledAt): bỏ trống là bây giờ,
 * phải hợp lệ, không trước năm 2000 và không quá 1 ngày sau hiện tại.
 */
export function parseTransactionDate(value: unknown, label: string, now = new Date()) {
    if (value == null || value === "") return now;
    const date = value instanceof Date ? new Date(value.getTime()) : new Date(value as string);
    if (Number.isNaN(date.getTime())) {
        throw new Error(`${label} không hợp lệ`);
    }
    if (date < MIN_TRANSACTION_DATE) {
        throw new Error(`${label} không được trước năm 2000`);
    }
    if (date.getTime() > now.getTime() + MAX_FUTURE_MS) {
        throw new Error(`${label} không được sau hôm nay quá 1 ngày`);
    }
    return date;
}
