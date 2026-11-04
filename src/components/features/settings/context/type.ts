import type {
    ITransactionAuditData,
    TransactionAuditKind,
} from "@/libs/interfaces/transactionAuditsData";

export interface ISettingsContextProps {
    // Khóa sổ
    /** Mốc đang lưu (YYYY-MM-DD giờ VN) hoặc null */
    savedLockDay: string | null;
    /** Giá trị ô ngày (YYYY-MM-DD) */
    lockInput: string;
    /** Ngày lớn nhất được chọn (khóa tới hết hôm nay) */
    maxLockDay: string;
    isSettingsLoading: boolean;
    isSavingLock: boolean;
    setLockInput: (value: string) => void;
    handleSaveLock: () => void;
    handleClearLock: () => void;

    // Lịch sử sửa/xóa
    auditKind: TransactionAuditKind | "";
    auditItems: ITransactionAuditData[];
    /** id danh mục / nguồn → tên */
    auditNames: Record<string, string>;
    auditPage: number;
    auditTotalPages: number;
    auditTotal: number;
    isAuditsLoading: boolean;
    handleAuditKindChange: (kind: TransactionAuditKind | "") => void;
    handleAuditPageChange: (page: number) => void;
}
