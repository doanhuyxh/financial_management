import { describe, expect, test } from "bun:test";
import {
    buildBankAppDeeplink,
    buildVietQrPayload,
    findBankAppByCode,
    parseVietQrPayload,
} from "@/libs/utils/vietQr";
import type { IVietQrBankApp } from "@/libs/interfaces/sourcesOfMoneyData";

describe("parseVietQrPayload", () => {
    test("đọc lại QR động do buildVietQrPayload tạo", () => {
        const payload = buildVietQrPayload({
            bin: "970422",
            accountNumber: "0123456789",
            amount: 150000,
            note: "Trả tiền cà phê",
        });
        const result = parseVietQrPayload(payload);
        expect(result).toEqual({
            ok: true,
            data: {
                bin: "970422",
                accountNumber: "0123456789",
                isCard: false,
                amount: 150000,
                note: "Tra tien ca phe",
                receiverName: undefined,
            },
        });
    });

    test("QR tĩnh: không có số tiền, nội dung", () => {
        const result = parseVietQrPayload(buildVietQrPayload({ bin: "970436", accountNumber: "1234" }));
        expect(result.ok && result.data.amount).toBeUndefined();
        expect(result.ok && result.data.note).toBeUndefined();
    });

    test("đọc QR thật có tên người nhận và số tiền dạng thập phân", () => {
        // QR theo chuẩn NAPAS có tag 59 (tên) và 54 = "50000.00"
        const body =
            "000201010212" +
            "38540010A00000072701240006970415011011223344550208QRIBFTTA" +
            "5303704540850000.005802VN5912NGUYEN VAN A" +
            "62080804ABCD6304";
        const result = parseVietQrPayload(body + crcOf(body));
        expect(result.ok && result.data).toMatchObject({
            bin: "970415",
            accountNumber: "1122334455",
            amount: 50000,
            note: "ABCD",
            receiverName: "NGUYEN VAN A",
        });
    });

    test("sai CRC thì báo QR hỏng", () => {
        const payload = buildVietQrPayload({ bin: "970422", accountNumber: "0123456789" });
        const broken = payload.slice(0, -4) + (payload.endsWith("0000") ? "1111" : "0000");
        expect(parseVietQrPayload(broken)).toEqual({
            ok: false,
            error: "Mã QR bị hỏng (sai mã kiểm tra), hãy quét lại",
        });
    });

    test("chuỗi không phải VietQR", () => {
        expect(parseVietQrPayload("https://example.com").ok).toBe(false);
        expect(parseVietQrPayload("").ok).toBe(false);
    });
});

/** Tính CRC bằng chính buildVietQrPayload không được, nên tự tính ở đây (CRC16-CCITT). */
function crcOf(input: string) {
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

describe("findBankAppByCode", () => {
    const app = (appId: string): IVietQrBankApp => ({
        appId,
        appName: appId,
        appLogo: "",
        bankName: "",
        deeplink: "",
        autofill: 0,
    });
    const apps = [app("acb"), app("acb-biz"), app("vib-2"), app("mb"), app("mbv")];

    test("khớp đúng mã trước, rồi tới mã có hậu tố (bỏ app doanh nghiệp)", () => {
        expect(findBankAppByCode(apps, "MB")?.appId).toBe("mb");
        expect(findBankAppByCode(apps, "ACB")?.appId).toBe("acb");
        expect(findBankAppByCode(apps, "VIB")?.appId).toBe("vib-2");
        expect(findBankAppByCode(apps, "VCB")).toBeUndefined();
        expect(findBankAppByCode(apps, undefined)).toBeUndefined();
    });
});

describe("buildBankAppDeeplink", () => {
    test("app tự điền: có người nhận, số tiền, nội dung không dấu", () => {
        const url = new URL(
            buildBankAppDeeplink({
                appId: "mb",
                autofill: true,
                accountNumber: "0123",
                receiverBankCode: "VCB",
                amount: 50000,
                note: "Cà phê sáng",
            }),
        );
        expect(url.origin + url.pathname).toBe("https://dl.vietqr.io/pay");
        expect(url.searchParams.get("app")).toBe("mb");
        expect(url.searchParams.get("ba")).toBe("0123@vcb");
        expect(url.searchParams.get("am")).toBe("50000");
        expect(url.searchParams.get("tn")).toBe("Ca phe sang");
    });

    test("app không tự điền: chỉ mở app", () => {
        expect(
            buildBankAppDeeplink({
                appId: "vcb",
                autofill: false,
                accountNumber: "0123",
                receiverBankCode: "MB",
                amount: 50000,
            }),
        ).toBe("https://dl.vietqr.io/pay?app=vcb");
    });
});
