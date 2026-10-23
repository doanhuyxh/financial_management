import { Schema, model, models, type Document, type Types } from "mongoose";
import { modelUserName } from "./users.model";
import { modelCategoriesName } from "./categories.model";

/** Hạn mức chi tiêu mỗi tháng, áp dụng cho mọi tháng. */
export interface IBudget extends Document {
    userId: Types.ObjectId;
    /** null = ngân sách tổng cho mọi chi tiêu */
    categoryId: Types.ObjectId | null;
    amount: number;
    createdAt: Date;
    updatedAt: Date;
}

const budgetsSchema = new Schema<IBudget>(
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
            default: null,
        },
        amount: {
            type: Number,
            required: true,
            min: [1, "Hạn mức phải lớn hơn 0"],
        },
    },
    { timestamps: true },
);

// Mỗi danh mục (và ngân sách tổng, categoryId = null) chỉ có một ngân sách
budgetsSchema.index({ userId: 1, categoryId: 1 }, { unique: true });

export const modelBudgetsName = "budgets";
const BudgetsModel = models[modelBudgetsName] || model<IBudget>(modelBudgetsName, budgetsSchema);

export default BudgetsModel;
