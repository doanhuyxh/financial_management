import type { IVietQrBankApp } from "@/libs/interfaces/sourcesOfMoneyData";

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

const SERVICE_TO_CARD = "QRIBFTTC";

/** Tách chuỗi TLV (id 2 số + độ dài 2 số + giá trị). Sai cấu trúc thì trả null. */
function parseTlv(input: string): Map<string, string> | null {
    const result = new Map<string, string>();
    let index = 0;
    while (index < input.length) {
        const id = input.slice(index, index + 2);
        const length = Number(input.slice(index + 2, index + 4));
        if (!/^\d{2}$/.test(id) || !Number.isInteger(length) || index + 4 + length > input.length) {
            return null;
        }
        result.set(id, input.slice(index + 4, index + 4 + length));
        index += 4 + length;
    }
    return result;
}

export interface IParsedVietQr {
    /** BIN 6 số của ngân hàng người nhận */
    bin: string;
    /** Số tài khoản (hoặc số thẻ khi `isCard`) người nhận */
    accountNumber: string;
    /** QR gắn số thẻ thay vì số tài khoản (dịch vụ QRIBFTTC) */
    isCard: boolean;
    /** Số tiền (VND) có sẵn trong QR động */
    amount?: number;
    /** Nội dung chuyển khoản (tag 62.08) */
    note?: string;
    /** Tên người nhận (tag 59), hiếm khi có ở QR cá nhân */
    receiverName?: string;
}

export type ParseVietQrResult =
    | { ok: true; data: IParsedVietQr }
    | { ok: false; error: string };

/**
 * Đọc chuỗi VietQR (EMVCo/NAPAS) chuyển khoản tới tài khoản hoặc thẻ.
 * Kiểm CRC; QR không phải VietQR (VNPay, QR cửa hàng riêng của ví...) thì báo lỗi.
 */
export function parseVietQrPayload(raw: string): ParseVietQrResult {
    const payload = raw.trim();
    const notVietQr: ParseVietQrResult = {
        ok: false,
        error: "Mã QR này không phải VietQR chuyển khoản ngân hàng",
    };

    const crcIndex = payload.lastIndexOf("6304");
    if (crcIndex < 0 || crcIndex + 8 !== payload.length) return notVietQr;
    if (crc16(payload.slice(0, crcIndex + 4)) !== payload.slice(crcIndex + 4).toUpperCase()) {
        return { ok: false, error: "Mã QR bị hỏng (sai mã kiểm tra), hãy quét lại" };
    }

    const root = parseTlv(payload);
    const merchant = root?.get("38");
    const merchantTags = merchant ? parseTlv(merchant) : null;
    if (!root || !merchantTags || merchantTags.get("00") !== NAPAS_GUID) return notVietQr;

    const beneficiary = parseTlv(merchantTags.get("01") ?? "");
    const bin = beneficiary?.get("00") ?? "";
    const accountNumber = beneficiary?.get("01") ?? "";
    if (!/^\d{6}$/.test(bin) || !accountNumber) return notVietQr;

    const amountRaw = root.get("54");
    const amountValue = amountRaw ? Math.round(Number(amountRaw)) : NaN;
    const additional = parseTlv(root.get("62") ?? "");
    const note = additional?.get("08")?.trim();
    const receiverName = root.get("59")?.trim();

    return {
        ok: true,
        data: {
            bin,
            accountNumber,
            isCard: merchantTags.get("02") === SERVICE_TO_CARD,
            amount: Number.isFinite(amountValue) && amountValue > 0 ? amountValue : undefined,
            note: note || undefined,
            receiverName: receiverName && receiverName !== "NA" ? receiverName : undefined,
        },
    };
}

/**
 * App ứng với mã ngân hàng (`code` trong danh sách ngân hàng VietQR, VD "MB", "VIB").
 * appId thường là code viết thường; vài app có hậu tố ("vib-2"). Ưu tiên khớp đúng.
 */
export function findBankAppByCode(apps: IVietQrBankApp[], bankCode?: string | null) {
    if (!bankCode) return undefined;
    const code = bankCode.toLowerCase();
    return (
        apps.find((app) => app.appId === code) ??
        apps.find((app) => app.appId.startsWith(`${code}-`) && !app.appId.endsWith("-biz"))
    );
}

const VIETQR_DEEPLINK_BASE = "https://dl.vietqr.io/pay";

/**
 * Link mở app ngân hàng `appId`. App có autofill thì điền sẵn người nhận
 * (`ba` = số TK@mã ngân hàng nhận), số tiền và nội dung; app khác chỉ mở app.
 */
export function buildBankAppDeeplink({
    appId,
    autofill,
    accountNumber,
    receiverBankCode,
    amount,
    note,
    receiverName,
    returnUrl,
}: {
    appId: string;
    autofill: boolean;
    accountNumber: string;
    receiverBankCode?: string | null;
    amount: number;
    note?: string;
    receiverName?: string;
    returnUrl?: string;
}) {
    const params = new URLSearchParams({ app: appId });
    if (autofill && receiverBankCode) {
        params.set("ba", `${accountNumber}@${receiverBankCode.toLowerCase()}`);
        params.set("am", String(Math.round(amount)));
        const purpose = note ? normalizeTransferNote(note) : "";
        if (purpose) params.set("tn", purpose);
        if (receiverName) params.set("bn", receiverName);
        if (returnUrl) params.set("url", returnUrl);
    }
    return `${VIETQR_DEEPLINK_BASE}?${params.toString()}`;
}
