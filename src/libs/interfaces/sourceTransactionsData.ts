import type { CardFeeType } from "@/libs/interfaces/expensesData";
import type { PaginatedResponse } from "@/libs/interfaces/ApiResponseData";
import type { SourcesOfMoneyType } from "@/libs/interfaces/sourcesOfMoneyData";

/** Một dòng lịch sử của nguồn tiền, gộp từ chi tiêu, thu nhập, chuyển tiền và điều chỉnh tay. */
export enum SourceTransactionKind {
    EXPENSE = "EXPENSE",
    INCOME = "INCOME",
    TRANSFER_OUT = "TRANSFER_OUT",
    TRANSFER_IN = "TRANSFER_IN",
    ADJUSTMENT = "ADJUSTMENT",
}

export const SOURCE_TRANSACTION_KIND_LABELS: Record<SourceTransactionKind, string> = {
    [SourceTransactionKind.EXPENSE]: "Chi tiêu",
    [SourceTransactionKind.INCOME]: "Thu nhập",
    [SourceTransactionKind.TRANSFER_OUT]: "Chuyển đi",
    [SourceTransactionKind.TRANSFER_IN]: "Chuyển đến",
    [SourceTransactionKind.ADJUSTMENT]: "Điều chỉnh",
};

/** Bộ lọc loại trên UI: TRANSFER gồm cả chuyển đi và chuyển đến. */
export enum SourceTransactionFilter {
    EXPENSE = "EXPENSE",
    INCOME = "INCOME",
    TRANSFER = "TRANSFER",
    ADJUSTMENT = "ADJUSTMENT",
}

type TransactionRef = { _id: string; name: string; archivedAt?: string | null };

export interface ISourceTransactionData {
    _id: string;
    kind: SourceTransactionKind;
    occurredAt: string;
    /**
     * Biến động của số dư (nguồn thường) hoặc dư nợ (thẻ tín dụng):
     * dương là tăng, âm là giảm.
     */
    delta: number;
    note?: string;
    category?: TransactionRef | null;
    /** Nguồn đối ứng của chuyển tiền. */
    counterpartSource?: TransactionRef | null;
    cardFeeType?: CardFeeType;
    /** Phí chuyển tiền từ thẻ (đã nằm trong delta, chỉ để hiển thị). */
    feeAmount?: number;
    /** Chỉ có ở điều chỉnh tay. */
    previousValue?: number;
    newValue?: number;
}

export interface ISourceTransactionSummary {
    /** Tổng các delta dương. */
    increase: number;
    /** Tổng trị tuyệt đối các delta âm. */
    decrease: number;
}

export interface ISourceTransactionsResponse extends PaginatedResponse<ISourceTransactionData> {
    summary: ISourceTransactionSummary;
}

export interface ISourceTransactionQuery {
    page?: number;
    limit?: number;
    kind?: SourceTransactionFilter;
    /** YYYY-MM-DD, giờ VN */
    from?: string;
    /** YYYY-MM-DD, giờ VN, tính đến cuối ngày */
    to?: string;
}

/** Dòng lịch sử trên link chia sẻ public: chỉ thời gian, số tiền và nội dung. */
export interface IPublicSourceTransactionData {
    occurredAt: string;
    delta: number;
    note?: string;
}

export interface IPublicShareInfo {
    sourceName: string;
    sourceType: SourcesOfMoneyType;
    from?: string | null;
    to?: string | null;
    expiresAt?: string | null;
}
