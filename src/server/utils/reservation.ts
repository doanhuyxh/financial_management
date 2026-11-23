import SourcesOfMoneyModel from "@/server/models/sources-of-money.model";
import { SourcesOfMoneyType } from "@/libs/interfaces/sourcesOfMoneyData";
import { formatMoney } from "@/libs/utils/formatMoney";

/**
 * Giữ chỗ cho chi dự kiến (`SourceOfMoney.reservedAmount`). Số dư/dư nợ chưa đổi, nhưng mọi
 * khoản trừ tiền mới (chi tiêu, chuyển tiền đi) phải nằm trong phần khả dụng:
 * - nguồn thường: balance − reserved ≥ amount
 * - thẻ: currentDebt + reserved + amount ≤ creditLimit
 * Điều kiện nằm trong filter của `findOneAndUpdate` (như `balance: {$gte}`) để request đồng thời
 * không vượt. Dữ liệu cũ thiếu trường coi là 0.
 */
const RESERVED = { $ifNull: ["$reservedAmount", 0] };
const EPSILON = 0.0001;

/** Filter: nguồn thường còn đủ phần khả dụng để trừ `amount`. */
export function availableBalanceFilter(amount: number) {
    return {
        $expr: {
            $gte: [{ $subtract: [{ $ifNull: ["$balance", 0] }, RESERVED] }, amount - EPSILON],
        },
    };
}

/** Filter: thẻ còn đủ hạn mức khả dụng để tăng dư nợ thêm `amount`. */
export function availableCreditFilter(amount: number) {
    return {
        $expr: {
            $lte: [
                { $add: [{ $ifNull: ["$creditDetails.currentDebt", 0] }, RESERVED, amount] },
                { $add: [{ $ifNull: ["$creditDetails.creditLimit", 0] }, EPSILON] },
            ],
        },
    };
}

type ReservableSource = {
    type: SourcesOfMoneyType;
    balance?: number | null;
    reservedAmount?: number | null;
    creditDetails?: { creditLimit?: number | null; currentDebt?: number | null } | null;
};

export function getReserved(source: ReservableSource) {
    return source.reservedAmount ?? 0;
}

/**
 * Thông báo khi không đủ để trừ `amount`. Không có giữ chỗ thì giữ đúng câu cũ;
 * có giữ chỗ và chính phần giữ chỗ làm thiếu thì nói rõ.
 */
export function insufficientMessage(source: ReservableSource, amount: number) {
    const reserved = getReserved(source);
    const isCard = source.type === SourcesOfMoneyType.CREDIT_CARD;
    const base = isCard ? "Vượt hạn mức tín dụng còn lại" : "Số dư nguồn tiền không đủ";
    if (reserved <= 0) return base;
    const rawRoom = isCard
        ? (source.creditDetails?.creditLimit ?? 0) - (source.creditDetails?.currentDebt ?? 0)
        : (source.balance ?? 0);
    if (rawRoom + EPSILON < amount) return base;
    return `${isCard ? "Hạn mức khả dụng" : "Số dư khả dụng"} không đủ: đang giữ ${formatMoney(reserved)} cho chi dự kiến`;
}

/** Filter khả dụng theo loại nguồn. */
export function availableFilterFor(type: SourcesOfMoneyType, amount: number) {
    return type === SourcesOfMoneyType.CREDIT_CARD
        ? availableCreditFilter(amount)
        : availableBalanceFilter(amount);
}

/**
 * Giữ chỗ `amount` trên nguồn (atomic, kiểm tra phần khả dụng trong filter). Nguồn đã lưu trữ
 * thì không giữ chỗ được. Lỗi thì throw với thông báo cho người dùng.
 */
export async function reserveOnSource(userId: string, sourceId: string, amount: number) {
    const source = await SourcesOfMoneyModel.findOne({ _id: sourceId, userId }).lean<
        ReservableSource & { archivedAt?: Date | null }
    >();
    if (!source) throw new Error("Không tìm thấy nguồn tiền");
    if (source.archivedAt) throw new Error("Nguồn tiền đã bị xóa");

    const updated = await SourcesOfMoneyModel.findOneAndUpdate(
        {
            _id: sourceId,
            userId,
            type: source.type,
            archivedAt: null,
            ...availableFilterFor(source.type, amount),
        },
        { $inc: { reservedAmount: amount } },
        { returnDocument: "after" },
    );
    if (!updated) {
        const fresh = await SourcesOfMoneyModel.findOne({ _id: sourceId, userId }).lean<ReservableSource>();
        throw new Error(insufficientMessage(fresh ?? source, amount));
    }
    return updated;
}

/**
 * Bỏ giữ chỗ `amount` (hủy, sửa, rollback). Không bao giờ xuống dưới 0 (dữ liệu lệch thì kẹp về 0
 * thay vì kẹt khoản dự kiến). Nguồn không còn thì bỏ qua.
 */
export async function releaseOnSource(userId: string, sourceId: string, amount: number) {
    return SourcesOfMoneyModel.findOneAndUpdate(
        { _id: sourceId, userId },
        [
            {
                $set: {
                    reservedAmount: {
                        $max: [0, { $subtract: [{ $ifNull: ["$reservedAmount", 0] }, amount] }],
                    },
                },
            },
        ],
        { returnDocument: "after", updatePipeline: true },
    );
}
