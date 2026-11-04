import { Schema, model, models, type Document, type Types } from "mongoose";
import { modelUserName } from "./users.model";
import { modelSourcesOfMoneyName } from "./sources-of-money.model";
import { RolloverJourneyEndReason } from "@/libs/interfaces/rolloverJourneysData";

/**
 * Hành trình đáo hạn của một thẻ: mở ở lần đáo đầu, đóng khi sạch nợ hoặc người dùng kết thúc.
 * Chỉ lưu mốc và gốc; phí, số lần, tự trả tính từ CardRollover và Transfer (xem business/card-rollover.md).
 */
export interface IRolloverJourney extends Document {
    userId: Types.ObjectId;
    sourceOfMoneyId: Types.ObjectId;
    startedAt: Date;
    baseAmount: number;
    endedAt?: Date | null;
    endReason?: RolloverJourneyEndReason | null;
    note?: string;
    createdAt: Date;
    updatedAt: Date;
}

const rolloverJourneysSchema = new Schema<IRolloverJourney>(
    {
        userId: { type: Schema.Types.ObjectId, ref: modelUserName, required: true, index: true },
        sourceOfMoneyId: {
            type: Schema.Types.ObjectId,
            ref: modelSourcesOfMoneyName,
            required: true,
            index: true,
        },
        startedAt: { type: Date, required: true },
        baseAmount: { type: Number, required: true, min: 0 },
        endedAt: { type: Date, default: null },
        endReason: { type: String, enum: Object.values(RolloverJourneyEndReason), default: null },
        note: { type: String, trim: true, default: "" },
    },
    { timestamps: true },
);

rolloverJourneysSchema.index({ userId: 1, sourceOfMoneyId: 1, startedAt: -1 });

export const modelRolloverJourneysName = "rolloverJourneys";
const RolloverJourneysModel =
    models[modelRolloverJourneysName] ||
    model<IRolloverJourney>(modelRolloverJourneysName, rolloverJourneysSchema);

export default RolloverJourneysModel;
