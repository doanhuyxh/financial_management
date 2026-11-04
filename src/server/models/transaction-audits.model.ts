import { Schema, model, models, type Document, type Types } from "mongoose";
import { modelUserName } from "./users.model";
import {
    TransactionAuditAction,
    TransactionAuditKind,
    type ITransactionAuditSnapshot,
} from "@/libs/interfaces/transactionAuditsData";

/**
 * Lịch sử sửa/xóa giao dịch (chi tiêu, thu nhập, chuyển tiền, đáo hạn). Chỉ ghi sau khi thao tác
 * thành công; ghi lỗi không làm hỏng thao tác chính (`recordTransactionAudit`).
 */
export interface ITransactionAudit extends Document {
    userId: Types.ObjectId;
    kind: TransactionAuditKind;
    refId: Types.ObjectId;
    action: TransactionAuditAction;
    before: ITransactionAuditSnapshot;
    after: ITransactionAuditSnapshot | null;
    createdAt: Date;
    updatedAt: Date;
}

const transactionAuditsSchema = new Schema<ITransactionAudit>(
    {
        userId: { type: Schema.Types.ObjectId, ref: modelUserName, required: true },
        kind: { type: String, enum: Object.values(TransactionAuditKind), required: true },
        refId: { type: Schema.Types.ObjectId, required: true },
        action: { type: String, enum: Object.values(TransactionAuditAction), required: true },
        before: { type: Schema.Types.Mixed, required: true },
        after: { type: Schema.Types.Mixed, default: null },
    },
    { timestamps: true, minimize: false },
);

transactionAuditsSchema.index({ userId: 1, createdAt: -1 });
transactionAuditsSchema.index({ userId: 1, kind: 1, createdAt: -1 });

export const modelTransactionAuditsName = "transactionAudits";
const TransactionAuditsModel =
    models[modelTransactionAuditsName] ||
    model<ITransactionAudit>(modelTransactionAuditsName, transactionAuditsSchema);

export default TransactionAuditsModel;
