import { Schema, model, models, type Document, type Types } from "mongoose";
import { modelUserName } from "./users.model";
import { modelSourcesOfMoneyName } from "./sources-of-money.model";
import { BalanceAdjustmentField } from "@/libs/interfaces/balanceAdjustmentsData";

/** Lịch sử sửa tay số dư (nguồn thường) hoặc dư nợ (thẻ tín dụng) trên form nguồn tiền. */
export interface IBalanceAdjustment extends Document {
    userId: Types.ObjectId;
    sourceOfMoneyId: Types.ObjectId;
    field: BalanceAdjustmentField;
    previousValue: number;
    newValue: number;
    /** newValue − previousValue */
    delta: number;
    note?: string;
    adjustedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const balanceAdjustmentsSchema = new Schema<IBalanceAdjustment>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: modelUserName,
            required: true,
            index: true,
        },
        sourceOfMoneyId: {
            type: Schema.Types.ObjectId,
            ref: modelSourcesOfMoneyName,
            required: true,
        },
        field: {
            type: String,
            enum: Object.values(BalanceAdjustmentField),
            required: true,
        },
        previousValue: { type: Number, required: true },
        newValue: { type: Number, required: true },
        delta: { type: Number, required: true },
        note: {
            type: String,
            trim: true,
            default: "",
        },
        adjustedAt: {
            type: Date,
            required: true,
            default: Date.now,
        },
    },
    { timestamps: true },
);

balanceAdjustmentsSchema.index({ userId: 1, sourceOfMoneyId: 1, adjustedAt: -1 });

export const modelBalanceAdjustmentsName = "balanceAdjustments";
const BalanceAdjustmentsModel =
    models[modelBalanceAdjustmentsName] ||
    model<IBalanceAdjustment>(modelBalanceAdjustmentsName, balanceAdjustmentsSchema);

export default BalanceAdjustmentsModel;
