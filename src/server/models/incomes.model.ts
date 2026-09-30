import { Schema, model, models, type Document, type Types } from "mongoose";
import { modelUserName } from "./users.model";
import { modelCategoriesName } from "./categories.model";
import { modelSourcesOfMoneyName } from "./sources-of-money.model";

export interface IIncome extends Document {
    userId: Types.ObjectId;
    categoryId: Types.ObjectId;
    sourceOfMoneyId: Types.ObjectId;
    amount: number;
    note?: string;
    receivedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const incomesSchema = new Schema<IIncome>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: modelUserName,
            required: true,
            index: true,
        },
        categoryId: {
            type: Schema.Types.ObjectId,
            ref: modelCategoriesName,
            required: true,
            index: true,
        },
        sourceOfMoneyId: {
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
        note: {
            type: String,
            trim: true,
            default: "",
        },
        receivedAt: {
            type: Date,
            required: true,
            default: Date.now,
            index: true,
        },
    },
    { timestamps: true },
);

incomesSchema.index({ userId: 1, receivedAt: -1 });

export const modelIncomesName = "incomes";
const IncomesModel =
    models[modelIncomesName] || model<IIncome>(modelIncomesName, incomesSchema);

export default IncomesModel;
