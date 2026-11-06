import { Schema, model, models, type Document } from "mongoose";
import type { IDepositRateTier } from "@/libs/interfaces/depositRatesData";

/**
 * Lãi suất tiết kiệm server tự lấy từ trang chính thức của ngân hàng.
 * Dữ liệu **công khai, dùng chung mọi user** nên không có `userId` (ngoại lệ có chủ đích của luật 1,
 * giống danh sách ngân hàng VietQR): user không ghi được vào đây, chỉ tiến trình lấy dữ liệu ghi.
 */
export interface IDepositRateSnapshot extends Document {
    /** `<provider>:<sản phẩm>`, VD `vcb:online` */
    key: string;
    bankCode: string;
    bankName: string;
    product: string;
    sourceUrl: string;
    tiers: IDepositRateTier[];
    /** Lần lấy thành công gần nhất (null nếu chưa từng thành công) */
    fetchedAt: Date | null;
    lastAttemptAt: Date | null;
    lastError: string | null;
    createdAt: Date;
    updatedAt: Date;
}

const depositRateSnapshotsSchema = new Schema<IDepositRateSnapshot>(
    {
        key: { type: String, required: true, unique: true },
        bankCode: { type: String, required: true },
        bankName: { type: String, required: true },
        product: { type: String, required: true },
        sourceUrl: { type: String, required: true },
        tiers: { type: Schema.Types.Mixed, default: [] },
        fetchedAt: { type: Date, default: null },
        lastAttemptAt: { type: Date, default: null },
        lastError: { type: String, default: null },
    },
    { timestamps: true, minimize: false },
);

export const modelDepositRateSnapshotsName = "depositRateSnapshots";
const DepositRateSnapshotsModel =
    models[modelDepositRateSnapshotsName] ||
    model<IDepositRateSnapshot>(modelDepositRateSnapshotsName, depositRateSnapshotsSchema);

export default DepositRateSnapshotsModel;
