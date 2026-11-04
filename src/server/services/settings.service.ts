import dbConnect from "@/server/connectDb";
import UserModel from "@/server/models/users.model";
import type { IFromUserSettingsData, IUserSettingsData } from "@/libs/interfaces/userSettingsData";
import {
    errorResponseWithStatusCode,
    successResponse,
    unauthorizedResponse,
} from "../utils/responseServer";
import { getCurrentUser } from "../utils/getCurrentUser";
import { normalizeDay, startOfVietnamDay } from "../utils/dayRange";
import { MIN_TRANSACTION_DATE } from "../utils/transactionDate";

const DAY_MS = 24 * 60 * 60 * 1000;

function toSettingsData(user: { ledgerLockedBefore?: Date | null } | null): IUserSettingsData {
    return { ledgerLockedBefore: user?.ledgerLockedBefore?.toISOString() ?? null };
}

/**
 * Mốc khóa sổ: YYYY-MM-DD (giờ VN) → đầu ngày đó; null/"" = bỏ khóa.
 * Không trước năm 2000, không sau ngày mai (khóa tới hết hôm nay là xa nhất).
 */
export function parseLedgerLock(value: unknown, now = new Date()): Date | null {
    if (value == null || value === "") return null;
    const day = normalizeDay(value);
    if (!day) throw new Error("Ngày khóa sổ không hợp lệ (cần YYYY-MM-DD)");
    const date = new Date(`${day}T00:00:00.000+07:00`);
    if (date < MIN_TRANSACTION_DATE) throw new Error("Ngày khóa sổ không được trước năm 2000");
    const tomorrow = new Date(startOfVietnamDay(now).getTime() + DAY_MS);
    if (date > tomorrow) throw new Error("Chỉ khóa sổ được tới hết hôm nay");
    return date;
}

export class SettingsService {
    static async getSettings() {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) return unauthorizedResponse();

        const doc = await UserModel.findById(user.userId)
            .select("ledgerLockedBefore")
            .lean<{ ledgerLockedBefore?: Date | null }>();
        return successResponse(toSettingsData(doc));
    }

    static async updateSettings(data: IFromUserSettingsData) {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) return unauthorizedResponse();

        try {
            if (!data || !("ledgerLockedBefore" in data)) {
                throw new Error("Thiếu ledgerLockedBefore");
            }
            const ledgerLockedBefore = parseLedgerLock(data.ledgerLockedBefore);
            const doc = await UserModel.findByIdAndUpdate(
                user.userId,
                { $set: { ledgerLockedBefore } },
                { returnDocument: "after" },
            )
                .select("ledgerLockedBefore")
                .lean<{ ledgerLockedBefore?: Date | null }>();
            if (!doc) return errorResponseWithStatusCode("Không tìm thấy tài khoản", 404);
            return successResponse(
                toSettingsData(doc),
                ledgerLockedBefore ? "Đã khóa sổ" : "Đã bỏ khóa sổ",
            );
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Lưu cài đặt thất bại";
            return errorResponseWithStatusCode(message, 400);
        }
    }
}
