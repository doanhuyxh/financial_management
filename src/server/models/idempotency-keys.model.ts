import { Schema, model, models, type Document, type Types } from "mongoose";
import { modelUserName } from "./users.model";

export enum IdempotencyStatus {
    PENDING = "PENDING",
    DONE = "DONE",
}

/**
 * Khóa chống gửi trùng cho POST tạo giao dịch (header `Idempotency-Key`). Chỉ lưu response
 * thành công; tự hết hạn sau 24 giờ (TTL index trên `createdAt`).
 */
export interface IIdempotencyKey extends Document {
    userId: Types.ObjectId;
    key: string;
    route: string;
    /** SHA-256 của body: cùng khóa nhưng body khác là lỗi phía client */
    bodyHash: string;
    status: IdempotencyStatus;
    responseStatus?: number;
    responseBody?: unknown;
    createdAt: Date;
    updatedAt: Date;
}

const idempotencyKeysSchema = new Schema<IIdempotencyKey>(
    {
        userId: { type: Schema.Types.ObjectId, ref: modelUserName, required: true },
        key: { type: String, required: true },
        route: { type: String, required: true },
        bodyHash: { type: String, required: true },
        status: {
            type: String,
            enum: Object.values(IdempotencyStatus),
            default: IdempotencyStatus.PENDING,
        },
        responseStatus: { type: Number },
        responseBody: { type: Schema.Types.Mixed },
    },
    { timestamps: true },
);

idempotencyKeysSchema.index({ userId: 1, key: 1 }, { unique: true });
idempotencyKeysSchema.index({ createdAt: 1 }, { expireAfterSeconds: 24 * 60 * 60 });

export const modelIdempotencyKeysName = "idempotencyKeys";
const IdempotencyKeysModel =
    models[modelIdempotencyKeysName] ||
    model<IIdempotencyKey>(modelIdempotencyKeysName, idempotencyKeysSchema);

export default IdempotencyKeysModel;
