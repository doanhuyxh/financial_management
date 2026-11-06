import { Schema, model, models, type Document, type Types } from "mongoose";
import type { IDepositRateTier } from "@/libs/interfaces/depositRatesData";
import { modelUserName } from "./users.model";

/** Bảng lãi suất tiết kiệm user tự nhập cho ngân hàng chưa có nguồn tự động. */
export interface IDepositRate extends Document {
    userId: Types.ObjectId;
    bankCode: string;
    bankName: string;
    product: string;
    /** Nhập tay chỉ có một bậc (`minAmount = 0`) */
    tiers: IDepositRateTier[];
    createdAt: Date;
    updatedAt: Date;
}

const depositRatesSchema = new Schema<IDepositRate>(
    {
        userId: { type: Schema.Types.ObjectId, ref: modelUserName, required: true },
        bankCode: { type: String, required: true, trim: true },
        bankName: { type: String, required: true, trim: true },
        product: { type: String, trim: true, default: "" },
        tiers: { type: Schema.Types.Mixed, default: [] },
    },
    { timestamps: true, minimize: false },
);

depositRatesSchema.index({ userId: 1, createdAt: 1 });

export const modelDepositRatesName = "depositRates";
const DepositRatesModel =
    models[modelDepositRatesName] || model<IDepositRate>(modelDepositRatesName, depositRatesSchema);

export default DepositRatesModel;
