import { SourcesOfMoneyType } from "@/libs/interfaces/sourcesOfMoneyData";

type TrackedSource = {
    type: SourcesOfMoneyType;
    balance?: number | null;
    creditDetails?: { currentDebt?: number | null } | null;
};

/**
 * Số mà nguồn tiền đang theo dõi: dư nợ với thẻ tín dụng, số dư với nguồn thường.
 * Dùng chung cho server (ghi lịch sử điều chỉnh) và form (gửi `expectedAmount`).
 */
export function getTrackedAmount(source: TrackedSource) {
    return source.type === SourcesOfMoneyType.CREDIT_CARD
        ? (source.creditDetails?.currentDebt ?? 0)
        : (source.balance ?? 0);
}

type AvailableSource = TrackedSource & {
    creditDetails?: { currentDebt?: number | null; creditLimit?: number | null } | null;
    reservedAmount?: number | null;
};

/**
 * Phần còn chi được ngay: nguồn thường = số dư − đang giữ chỗ chi dự kiến;
 * thẻ = hạn mức − dư nợ − đang giữ chỗ. Có thể âm khi số dư giảm sau lúc giữ chỗ
 * (VD: xóa thu nhập) — UI tự chặn về 0 nếu cần.
 */
export function getAvailableAmount(source: AvailableSource) {
    const reserved = source.reservedAmount ?? 0;
    if (source.type === SourcesOfMoneyType.CREDIT_CARD) {
        const limit = source.creditDetails?.creditLimit ?? 0;
        const debt = source.creditDetails?.currentDebt ?? 0;
        return limit - debt - reserved;
    }
    return (source.balance ?? 0) - reserved;
}
