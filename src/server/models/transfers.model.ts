import { Schema, model, models, type Document, type Types } from "mongoose";
import { modelUserName } from "./users.model";
import { modelCategoriesName } from "./categories.model";
import { modelSourcesOfMoneyName } from "./sources-of-money.model";
import { modelExpensesName } from "./expenses.model";

export interface ITransfer extends Document {
    userId: Types.ObjectId;
    fromSourceId: Types.ObjectId;
    toSourceId: Types.ObjectId;
    amount: number;
    feePercent: number;
    feeAmount: number;
    feeCategoryId?: Types.ObjectId;
    feeExpenseId?: Types.ObjectId;
    note?: string;
    transferredAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const transfersSchema = new Schema<ITransfer>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: modelUserName,
            required: true,
            index: true,
        },
        fromSourceId: {
            type: Schema.Types.ObjectId,
            ref: modelSourcesOfMoneyName,
            required: true,
            index: true,
        },
        toSourceId: {
            type: Schema.Types.ObjectId,
            ref: modelSourcesOfMoneyName,
            required: true,
            index: true,
        },
        amount: {
            type: Number,
            required: true,
            min: [0.01, "Số tiền phải lớn hơn 0"],
        },
        feePercent: {
            type: Number,
            default: 0,
            min: [0, "Phí không được âm"],
        },
        feeAmount: {
            type: Number,
            default: 0,
            min: [0, "Phí không được âm"],
        },
        feeCategoryId: {
            type: Schema.Types.ObjectId,
            ref: modelCategoriesName,
        },
        feeExpenseId: {
            type: Schema.Types.ObjectId,
            ref: modelExpensesName,
        },
        note: {
            type: String,
            trim: true,
            default: "",
        },
        transferredAt: {
            type: Date,
            required: true,
            default: Date.now,
            index: true,
        },
    },
    { timestamps: true },
);

transfersSchema.index({ userId: 1, transferredAt: -1 });

export const modelTransfersName = "transfers";
const TransfersModel =
    models[modelTransfersName] ||
    model<ITransfer>(modelTransfersName, transfersSchema);

export default TransfersModel;
