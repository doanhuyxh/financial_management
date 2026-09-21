import { Schema, model, models, type Document, type Types } from "mongoose";
import { modelUserName } from "./users.model";
import { modelCategoriesName } from "./categories.model";
import { modelSourcesOfMoneyName } from "./sources-of-money.model";

export interface IExpense extends Document {
    userId: Types.ObjectId;
    categoryId: Types.ObjectId;
    sourceOfMoneyId: Types.ObjectId;
    amount: number;
    note?: string;
    spentAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const expensesSchema = new Schema<IExpense>(
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
        spentAt: {
            type: Date,
            required: true,
            default: Date.now,
            index: true,
        },
    },
    { timestamps: true },
);

expensesSchema.index({ userId: 1, spentAt: -1 });

export const modelExpensesName = "expenses";
const ExpensesModel =
    models[modelExpensesName] || model<IExpense>(modelExpensesName, expensesSchema);

export default ExpensesModel;
