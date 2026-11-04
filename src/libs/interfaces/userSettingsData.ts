export interface IUserSettingsData {
    /** Mốc khóa sổ (ISO, đầu ngày giờ VN); giao dịch trước mốc không tạo/sửa/xóa được. null = không khóa. */
    ledgerLockedBefore: string | null;
}

export interface IFromUserSettingsData {
    /** YYYY-MM-DD (giờ VN) hoặc null để bỏ khóa */
    ledgerLockedBefore: string | null;
}
