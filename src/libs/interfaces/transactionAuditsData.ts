/** Loại giao dịch được ghi lịch sử sửa/xóa. */
export enum TransactionAuditKind {
    EXPENSE = "EXPENSE",
    INCOME = "INCOME",
    TRANSFER = "TRANSFER",
    CARD_ROLLOVER = "CARD_ROLLOVER",
}

export enum TransactionAuditAction {
    /** Chỉ ghi khi chi tiêu / thu nhập được tạo qua agent (MCP); tạo trên web không ghi */
    CREATE = "CREATE",
    UPDATE = "UPDATE",
    DELETE = "DELETE",
}

export const TRANSACTION_AUDIT_KIND_LABELS: Record<TransactionAuditKind, string> = {
    [TransactionAuditKind.EXPENSE]: "Chi tiêu",
    [TransactionAuditKind.INCOME]: "Thu nhập",
    [TransactionAuditKind.TRANSFER]: "Chuyển tiền",
    [TransactionAuditKind.CARD_ROLLOVER]: "Đáo hạn",
};

export const TRANSACTION_AUDIT_ACTION_LABELS: Record<TransactionAuditAction, string> = {
    [TransactionAuditAction.CREATE]: "Tạo",
    [TransactionAuditAction.UPDATE]: "Sửa",
    [TransactionAuditAction.DELETE]: "Xóa",
};

/** Ảnh chụp các trường nghiệp vụ của giao dịch tại thời điểm sửa/xóa (id dạng chuỗi, ngày ISO). */
export interface ITransactionAuditSnapshot {
    amount?: number;
    feeAmount?: number;
    paymentAmount?: number;
    /** Ngày giao dịch (spentAt / receivedAt / transferredAt / rolledAt) */
    date?: string;
    note?: string;
    categoryId?: string;
    sourceOfMoneyId?: string;
    fromSourceId?: string;
    toSourceId?: string;
    cardFeeType?: string;
    provider?: string;
}

/** Thao tác đến từ đâu; bản ghi cũ (trước khi có MCP) không có trường này = web. */
export type TransactionAuditVia = "web" | "mcp";

export interface ITransactionAuditData {
    _id: string;
    kind: TransactionAuditKind;
    refId: string;
    action: TransactionAuditAction;
    /** `{}` khi tạo */
    before: ITransactionAuditSnapshot;
    /** null khi xóa */
    after: ITransactionAuditSnapshot | null;
    via?: TransactionAuditVia;
    /** Token MCP đã thực hiện (khi `via = "mcp"`) */
    tokenId?: string | null;
    createdAt: string;
}

export interface IPaginatedTransactionAuditsQuery {
    page?: number;
    limit?: number;
    kind?: TransactionAuditKind;
}

export interface ITransactionAuditListData {
    items: ITransactionAuditData[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
    /** id danh mục / nguồn tiền xuất hiện trong trang → tên (kể cả đã lưu trữ) */
    names: Record<string, string>;
}
