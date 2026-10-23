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
