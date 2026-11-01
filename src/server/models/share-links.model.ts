import { Schema, model, models, type Document, type Types } from "mongoose";
import { modelUserName } from "./users.model";
import { modelSourcesOfMoneyName } from "./sources-of-money.model";

/** Link public (không cần đăng nhập) xem lịch sử giao dịch của một nguồn tiền. */
export interface IShareLink extends Document {
    userId: Types.ObjectId;
    sourceOfMoneyId: Types.ObjectId;
    /** SHA-256 của token; token gốc chỉ trả về một lần lúc tạo. */
    tokenHash: string;
    label?: string;
    /** YYYY-MM-DD, giờ VN */
    from?: string | null;
    to?: string | null;
    expiresAt?: Date | null;
    revokedAt?: Date | null;
    viewCount: number;
    lastViewedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

const shareLinksSchema = new Schema<IShareLink>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: modelUserName,
            required: true,
        },
        sourceOfMoneyId: {
            type: Schema.Types.ObjectId,
            ref: modelSourcesOfMoneyName,
            required: true,
        },
        tokenHash: {
            type: String,
            required: true,
            unique: true,
        },
        label: {
            type: String,
            trim: true,
            default: "",
        },
        from: { type: String, default: null },
        to: { type: String, default: null },
        expiresAt: { type: Date, default: null },
        revokedAt: { type: Date, default: null },
        viewCount: { type: Number, default: 0 },
        lastViewedAt: { type: Date, default: null },
    },
    { timestamps: true },
);

shareLinksSchema.index({ userId: 1, sourceOfMoneyId: 1, createdAt: -1 });

export const modelShareLinksName = "shareLinks";
const ShareLinksModel =
    models[modelShareLinksName] || model<IShareLink>(modelShareLinksName, shareLinksSchema);

export default ShareLinksModel;
