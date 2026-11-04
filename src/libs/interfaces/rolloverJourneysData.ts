import type { ICardRolloverData } from "./cardRolloversData";

/** Lý do kết thúc một hành trình đáo hạn. */
export enum RolloverJourneyEndReason {
    /** Dư nợ về 0 (tự phát hiện) */
    PAID_OFF = "PAID_OFF",
    /** Chuyển sang trả góp dư nợ */
    INSTALLMENT = "INSTALLMENT",
    /** Vay chỗ khác để trả */
    REFINANCED = "REFINANCED",
    /** Tự trả hết bằng tiền của mình */
    PAID_FULL = "PAID_FULL",
    OTHER = "OTHER",
}

export const ROLLOVER_JOURNEY_END_REASON_LABELS: Record<RolloverJourneyEndReason, string> = {
    [RolloverJourneyEndReason.PAID_OFF]: "Đã sạch nợ",
    [RolloverJourneyEndReason.INSTALLMENT]: "Chuyển trả góp",
    [RolloverJourneyEndReason.REFINANCED]: "Vay chỗ khác để trả",
    [RolloverJourneyEndReason.PAID_FULL]: "Tự trả hết",
    [RolloverJourneyEndReason.OTHER]: "Khác",
};

export interface IRolloverJourneySourceRef {
    _id: string;
    name: string;
    archivedAt?: string | null;
    creditDetails?: {
        creditLimit?: number;
        currentDebt?: number;
        statementDate?: number;
        dueDate?: number;
        interestRate?: number;
        rolloverFeePercent?: number;
    };
}

/** Thống kê tính từ CardRollover và Transfer vào thẻ trong khoảng hành trình. */
export interface IRolloverJourneyStats {
    rolloverCount: number;
    totalFee: number;
    /** Tổng tiền tự trả (chuyển tiền vào thẻ trong hành trình) */
    totalPaid: number;
    lastRolledAt?: string | null;
}

/**
 * Một hành trình đáo hạn: chuỗi đáo hạn liên tiếp của một thẻ, từ lần đầu đến khi sạch nợ
 * hoặc người dùng kết thúc. Số liệu không lưu, tính từ giao dịch.
 */
export interface IRolloverJourneyData {
    _id: string;
    sourceOfMoneyId: string | IRolloverJourneySourceRef;
    startedAt: string;
    /** Số tiền gốc (mặc định = A + x của lần đáo đầu), sửa tay được */
    baseAmount: number;
    endedAt?: string | null;
    endReason?: RolloverJourneyEndReason | null;
    note?: string;
    stats: IRolloverJourneyStats;
    createdAt?: string;
    updatedAt?: string;
}

/** Khoản tự trả vào thẻ trong hành trình (Transfer thường → thẻ). */
export interface IRolloverJourneyPayment {
    _id: string;
    amount: number;
    transferredAt: string;
    fromSource?: { _id: string; name: string; archivedAt?: string | null } | null;
    note?: string;
    /** Lần đáo hạn gắn với khoản trả này (nếu ghi từ modal đáo hạn) */
    rolloverId?: string | null;
}

export interface IRolloverJourneyDetail {
    journey: IRolloverJourneyData;
    /** Các lần đáo trong hành trình, tăng dần theo ngày */
    rollovers: ICardRolloverData[];
    payments: IRolloverJourneyPayment[];
}

export interface IFromEndRolloverJourneyData {
    endReason: RolloverJourneyEndReason;
    note?: string;
}

export interface IFromUpdateRolloverJourneyData {
    baseAmount?: number;
    note?: string;
}
