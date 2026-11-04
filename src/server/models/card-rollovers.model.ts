import { Schema, model, models, type Document, type Types } from "mongoose";
import { modelUserName } from "./users.model";
import { modelCategoriesName } from "./categories.model";
import { modelSourcesOfMoneyName } from "./sources-of-money.model";
import { modelExpensesName } from "./expenses.model";
import { modelTransfersName } from "./transfers.model";

/**
 * Đáo hạn thẻ tín dụng: bên dịch vụ ứng `amount` trả vào thẻ rồi quẹt lại `amount + feeAmount`.
 * Tiền của người dùng không đổi, dư nợ thẻ chỉ tăng đúng `feeAmount` (xem business/card-rollover.md).
 */
export interface ICardRollover extends Document {
    userId: Types.ObjectId;
    sourceOfMoneyId: Types.ObjectId;
    amount: number;
    feePercent: number;
    feeAmount: number;
    feeCategoryId?: Types.ObjectId;
    /** Expense "Phí đáo hạn" (skipBalanceAdjust) ghi nhận phí vào thống kê chi tiêu */
    feeExpenseId?: Types.ObjectId;
    /** Transfer "tự trả một phần" (thường → thẻ) ghi cùng lần đáo này */
    paymentTransferId?: Types.ObjectId;
    provider?: string;
    note?: string;
    rolledAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const cardRolloversSchema = new Schema<ICardRollover>(
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
        paymentTransferId: {
            type: Schema.Types.ObjectId,
            ref: modelTransfersName,
        },
        provider: {
            type: String,
            trim: true,
            default: "",
        },
        note: {
            type: String,
            trim: true,
            default: "",
        },
        rolledAt: {
            type: Date,
            required: true,
            default: Date.now,
            index: true,
        },
    },
    { timestamps: true },
);

cardRolloversSchema.index({ userId: 1, rolledAt: -1 });
// Lịch sử đáo hạn theo thẻ
cardRolloversSchema.index({ userId: 1, sourceOfMoneyId: 1, rolledAt: -1 });

export const modelCardRolloversName = "cardRollovers";
const CardRolloversModel =
    models[modelCardRolloversName] ||
    model<ICardRollover>(modelCardRolloversName, cardRolloversSchema);

export default CardRolloversModel;
