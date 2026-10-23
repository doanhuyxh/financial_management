/** Bỏ dấu tiếng Việt (kể cả đ/Đ). Nội dung QR và tên chủ TK chỉ nên chứa ký tự ASCII. */
export function removeVietnameseTones(value: string) {
    return value
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D");
}

/** Chuẩn hóa tên chủ tài khoản: không dấu, in hoa, gộp khoảng trắng. */
export function normalizeAccountName(value: string) {
    return removeVietnameseTones(value).toUpperCase().replace(/\s+/g, " ").trim();
}

/** Nội dung chuyển khoản: không dấu, chỉ chữ/số/khoảng trắng, tối đa 50 ký tự. */
export function normalizeTransferNote(value: string) {
    return removeVietnameseTones(value)
        .replace(/[^0-9A-Za-z ]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 50);
}

function tlv(id: string, value: string) {
    return `${id}${String(value.length).padStart(2, "0")}${value}`;
}

/** CRC16-CCITT (poly 0x1021, init 0xFFFF) theo chuẩn EMVCo. */
function crc16(input: string) {
    let crc = 0xffff;
    for (let i = 0; i < input.length; i++) {
        crc ^= input.charCodeAt(i) << 8;
        for (let bit = 0; bit < 8; bit++) {
            crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
            crc &= 0xffff;
        }
    }
    return crc.toString(16).toUpperCase().padStart(4, "0");
}

const NAPAS_GUID = "A000000727";
const SERVICE_TO_ACCOUNT = "QRIBFTTA";

/**
 * Tạo chuỗi VietQR (chuẩn EMVCo của NAPAS) để chuyển khoản tới số tài khoản.
 * Có `amount` thì là QR động (app ngân hàng điền sẵn số tiền), không thì QR tĩnh.
 */
export function buildVietQrPayload({
    bin,
    accountNumber,
    amount,
    note,
}: {
    bin: string;
    accountNumber: string;
    amount?: number;
    note?: string;
}) {
    const hasAmount = amount != null && Number.isFinite(amount) && amount > 0;
    const purpose = note ? normalizeTransferNote(note) : "";

    const merchantInfo =
        tlv("00", NAPAS_GUID) +
        tlv("01", tlv("00", bin) + tlv("01", accountNumber)) +
        tlv("02", SERVICE_TO_ACCOUNT);

    let payload =
        tlv("00", "01") +
        tlv("01", hasAmount ? "12" : "11") +
        tlv("38", merchantInfo) +
        tlv("53", "704") +
        (hasAmount ? tlv("54", String(Math.round(amount))) : "") +
        tlv("58", "VN") +
        (purpose ? tlv("62", tlv("08", purpose)) : "");

    payload += "6304";
    return payload + crc16(payload);
}
