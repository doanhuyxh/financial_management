/** Trần số tiền một giao dịch / số dư: 100 nghìn tỷ VND, vẫn nằm trong Number.MAX_SAFE_INTEGER. */
export const MAX_MONEY = 100_000_000_000_000;

interface IParseMoneyOptions {
    /** Cho phép 0 (số dư, hạn mức, dư nợ). Mặc định phải > 0 */
    allowZero?: boolean;
    /** Làm tròn thay vì từ chối số lẻ (số suy ra từ % như phí, số đáo hạn) */
    round?: boolean;
}

/**
 * Tiền là số nguyên VND trong khoảng [0 hoặc 1, MAX_MONEY]. Ném Error tiếng Việt khi sai,
 * để các service bắt và trả 400 như lỗi validate khác.
 */
export function parseMoney(value: unknown, label: string, options: IParseMoneyOptions = {}) {
    const raw = typeof value === "string" ? value.trim() : value;
    const number = raw === "" || raw == null ? Number.NaN : Number(raw);
    const min = options.allowZero ? 0 : 1;
    const rangeText = `từ ${min.toLocaleString("vi-VN")} đến ${MAX_MONEY.toLocaleString("vi-VN")}`;

    if (!Number.isFinite(number)) {
        throw new Error(`${label} không hợp lệ`);
    }
    const amount = options.round ? Math.round(number) : number;
    // Vượt trần báo trước (số quá lớn cũng không còn là số nguyên an toàn), rồi tới số lẻ, rồi số nhỏ
    if (amount > MAX_MONEY) {
        throw new Error(`${label} phải ${rangeText}`);
    }
    if (!Number.isInteger(amount)) {
        throw new Error(`${label} phải là số nguyên VND (không có phần lẻ)`);
    }
    if (amount < min) {
        throw new Error(`${label} phải ${rangeText}`);
    }
    return amount;
}

/** Validator Mongoose cho trường tiền: chặn cả đường ghi từ script. */
export const INTEGER_MONEY_VALIDATOR = {
    validator: (value: number | null | undefined) => value == null || Number.isInteger(value),
    message: "Số tiền phải là số nguyên VND",
};
