import UserModel from "@/server/models/users.model";
import { formatVietnamDay } from "./dayRange";

/** Mốc khóa sổ của user (đầu ngày giờ VN) hoặc null nếu không khóa. */
export async function getLedgerLock(userId: string): Promise<Date | null> {
    const user = await UserModel.findById(userId)
        .select("ledgerLockedBefore")
        .lean<{ ledgerLockedBefore?: Date | null }>();
    return user?.ledgerLockedBefore ?? null;
}

export function ledgerLockedMessage(lockedBefore: Date) {
    return `Kỳ đã khóa sổ: không thể thêm, sửa hoặc xóa giao dịch trước ngày ${formatVietnamDay(lockedBefore)}`;
}

/** Throw khi có ngày nào nằm trước mốc khóa. Truyền cả ngày cũ và ngày mới khi sửa. */
export function assertDatesUnlocked(
    lockedBefore: Date | null,
    dates: (Date | null | undefined)[],
) {
    if (!lockedBefore) return;
    for (const date of dates) {
        if (date && date.getTime() < lockedBefore.getTime()) {
            throw new Error(ledgerLockedMessage(lockedBefore));
        }
    }
}

/**
 * Chặn tạo/sửa/xóa giao dịch thuộc kỳ đã khóa sổ. Gọi trước mọi bước ghi số dư,
 * nên không cần rollback.
 */
export async function assertLedgerUnlocked(userId: string, ...dates: (Date | null | undefined)[]) {
    assertDatesUnlocked(await getLedgerLock(userId), dates);
}
