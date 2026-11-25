import type { BankAppPlatform } from "@/libs/networkApi/vietqr.api";
import { SourcesOfMoneyType, type ISourcesOfMoneyData } from "@/libs/interfaces/sourcesOfMoneyData";

/** iOS hay Android (danh sách app deeplink khác nhau); máy tính trả null: không mở được app ngân hàng. */
export function detectPlatform(): BankAppPlatform | null {
    if (typeof navigator === "undefined") return null;
    const ua = navigator.userAgent;
    // iPad đời mới báo UA như máy Mac nhưng có màn cảm ứng
    if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) {
        return "ios";
    }
    if (/Android/i.test(ua)) return "android";
    return null;
}

/** Chuyển khoản đi từ ngân hàng / ví (không phải tiền mặt hay thẻ tín dụng). */
export function canPayByTransfer(source: ISourcesOfMoneyData) {
    return source.type !== SourcesOfMoneyType.CASH && source.type !== SourcesOfMoneyType.CREDIT_CARD;
}

/** Nhớ trên máy (localStorage) để lần quét sau điền sẵn. */
export interface IScanPayMemory {
    lastSourceId?: string;
    /** App ngân hàng chọn tay cho nguồn (khi không tự ghép được từ số TK của nguồn) */
    appBySource: Record<string, string>;
    /** Theo người nhận `bin:số TK`: danh mục + nguồn đã dùng lần trước */
    recipients: Record<string, { categoryId: string; sourceId: string; usedAt: number }>;
}

export const EMPTY_SCAN_PAY_MEMORY: IScanPayMemory = { appBySource: {}, recipients: {} };

/** Giữ tối đa chừng này người nhận gần nhất */
export const MAX_REMEMBERED_RECIPIENTS = 100;

export function recipientKey(bin: string, accountNumber: string) {
    return `${bin}:${accountNumber}`;
}

/** Copy chữ; trả false nếu trình duyệt chặn (không có quyền, không phải https...). */
export async function copyText(text: string) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        return false;
    }
}
