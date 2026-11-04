import { Schema, model, models, type Document, type Types } from "mongoose";
import { modelUserName } from "./users.model";
import { modelSourcesOfMoneyName } from "./sources-of-money.model";

/**
 * Vết khi bước bù trừ (rollback) thủ công thất bại hoặc khi đối soát sửa số dư:
 * số dư/dư nợ của nguồn có thể đã lệch sổ cái. Script `reconcile-balances.ts` đọc collection này.
 */
export interface IIntegrityIssue extends Document {
    userId: Types.ObjectId;
    sourceOfMoneyId?: Types.ObjectId;
    /** VD: "expense.create", "transfer.delete", "reconcile" */
    operation: string;
    /** Bước bù trừ bị lỗi, VD: "revert-balance" */
    step: string;
    amount?: number;
    originalError?: string;
    rollbackError?: string;
    resolvedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

const integrityIssuesSchema = new Schema<IIntegrityIssue>(
    {
        userId: { type: Schema.Types.ObjectId, ref: modelUserName, required: true },
        sourceOfMoneyId: { type: Schema.Types.ObjectId, ref: modelSourcesOfMoneyName },
        operation: { type: String, required: true },
        step: { type: String, required: true },
        amount: { type: Number },
        originalError: { type: String, default: "" },
        rollbackError: { type: String, default: "" },
        resolvedAt: { type: Date, default: null },
    },
    { timestamps: true },
);

integrityIssuesSchema.index({ userId: 1, resolvedAt: 1, createdAt: -1 });

export const modelIntegrityIssuesName = "integrityIssues";
const IntegrityIssuesModel =
    models[modelIntegrityIssuesName] ||
    model<IIntegrityIssue>(modelIntegrityIssuesName, integrityIssuesSchema);

export default IntegrityIssuesModel;
