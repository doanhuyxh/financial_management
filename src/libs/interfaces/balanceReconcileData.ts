import type { SourcesOfMoneyType } from "./sourcesOfMoneyData";

/** Lý do không cho "Sửa về theo sổ" */
export enum ReconcileBlockReason {
    /** Nguồn tạo trước khi có sổ cái đầy đủ, chưa chạy script backfill-opening-balance */
    LEDGER_INCOMPLETE = "LEDGER_INCOMPLETE",
    /** Số theo sổ âm hoặc vượt hạn mức: cần người xem lại giao dịch */
    LEDGER_OUT_OF_RANGE = "LEDGER_OUT_OF_RANGE",
    ARCHIVED = "ARCHIVED",
}

export interface IBalanceReconcileData {
    sourceId: string;
    sourceType: SourcesOfMoneyType;
    /** Số dư (nguồn thường) hoặc dư nợ (thẻ) đang lưu */
    stored: number;
    /** Số suy ra từ giao dịch + điều chỉnh + phí đáo hạn */
    ledger: number;
    /** stored − ledger */
    diff: number;
    ledgerComplete: boolean;
    canApply: boolean;
    blockReason?: ReconcileBlockReason;
    /** Số lần bù trừ lỗi chưa xử lý trên nguồn này */
    openIssues: number;
}

export interface IApplyReconcileData {
    /** `stored` lúc người dùng xem: khác số hiện tại thì 409 */
    expectedStored: number;
    /** `ledger` lúc người dùng xem: khác số hiện tại thì 409 */
    expectedLedger: number;
}
