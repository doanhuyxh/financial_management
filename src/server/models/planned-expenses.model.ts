import { Schema, model, models, type Document, type Types } from "mongoose";
import { INTEGER_MONEY_VALIDATOR } from "@/server/utils/money";
import { modelUserName } from "./users.model";
import { modelCategoriesName } from "./categories.model";
import { modelSourcesOfMoneyName } from "./sources-of-money.model";
import { PlannedExpenseStatus } from "@/libs/interfaces/plannedExpensesData";

export interface IPlannedExpense extends Document {
    userId: Types.ObjectId;
    categoryId: Types.ObjectId;
    sourceOfMoneyId: Types.ObjectId;
    amount: number;
    note?: string;
    plannedAt: Date;
    status: PlannedExpenseStatus;
    expenseId?: Types.ObjectId | null;
    confirmedAt?: Date | null;
    cancelledAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

const plannedExpensesSchema = new Schema<IPlannedExpense>(
    {
        userId: { type: Schema.Types.ObjectId, ref: modelUserName, required: true },
        categoryId: { type: Schema.Types.ObjectId, ref: modelCategoriesName, required: true },
        sourceOfMoneyId: {
            type: Schema.Types.ObjectId,
            ref: modelSourcesOfMoneyName,
            required: true,
        },
        amount: {
            type: Number,
            required: true,
            min: [1, "Số tiền phải lớn hơn 0"],
            validate: INTEGER_MONEY_VALIDATOR,
        },
        note: { type: String, trim: true, default: "" },
        plannedAt: { type: Date, required: true },
        status: {
            type: String,
            enum: Object.values(PlannedExpenseStatus),
            required: true,
            default: PlannedExpenseStatus.PENDING,
        },
        expenseId: { type: Schema.Types.ObjectId, default: null },
        confirmedAt: { type: Date, default: null },
        cancelledAt: { type: Date, default: null },
    },
    { timestamps: true },
);

plannedExpensesSchema.index({ userId: 1, status: 1, plannedAt: 1 });
plannedExpensesSchema.index({ userId: 1, sourceOfMoneyId: 1, status: 1 });

export const modelPlannedExpensesName = "plannedExpenses";
const PlannedExpensesModel =
    models[modelPlannedExpensesName] ||
    model<IPlannedExpense>(modelPlannedExpensesName, plannedExpensesSchema);

export default PlannedExpensesModel;
