import { Schema, model, models, Document, Types } from "mongoose";
import { modelUserName } from "./users.model";
import { SourcesOfMoneyType, type IBankAccount } from "@/libs/interfaces/sourcesOfMoneyData";

export interface ISourcesOfMoney extends Document {
  userId: Types.ObjectId;
  name: string;
  type: SourcesOfMoneyType;
  balance: number; // Tiền hiện có (đối với CASH, BANK, E_WALLET)
  sortOrder: number;
  // Chi tiết dành riêng cho thẻ tín dụng
  creditDetails?: {
    creditLimit: number;    // Hạn mức cấp (VD: 50,000,000)
    currentDebt: number;    // Dư nợ đang nợ ngân hàng (VD: 15,000,000)
    statementDate?: number; // Ngày sao kê (1 - 31)
    dueDate?: number;       // Ngày đến hạn thanh toán (1 - 31)
  };
  // Tài khoản nhận tiền (chỉ loại BANK) để tạo mã VietQR
  bankAccount?: IBankAccount;
  metadata?: Record<string, any>;
  /** Xóa mềm: nguồn đã có giao dịch chỉ được lưu trữ để giữ lịch sử */
  archivedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const sourcesOfMoneySchema = new Schema<ISourcesOfMoney>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: modelUserName,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: Object.values(SourcesOfMoneyType),
      required: true,
    },
    balance: {
      type: Number,
      required: function (this: ISourcesOfMoney) {
        // Nếu là thẻ tín dụng, balance không bắt buộc hoặc mặc định bằng 0
        return this.type !== SourcesOfMoneyType.CREDIT_CARD;
      },
      default: 0,
    },
    sortOrder: {
      type: Number,
      required: true,
      default: 0,
      index: true,
    },
    creditDetails: {
      creditLimit: { type: Number, default: 0, min: 0 },
      currentDebt: { type: Number, default: 0, min: 0 },
      statementDate: { type: Number, min: 1, max: 31 },
      dueDate: { type: Number, min: 1, max: 31 },
    },
    bankAccount: {
      type: new Schema<IBankAccount>(
        {
          bin: { type: String, required: true, trim: true },
          bankName: { type: String, required: true, trim: true },
          accountNumber: { type: String, required: true, trim: true },
          accountName: { type: String, trim: true },
        },
        { _id: false },
      ),
      default: undefined,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    archivedAt: {
      type: Date,
      default: null,
    },
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual field: Hạn mức còn lại có thể chi tiêu của thẻ tín dụng
sourcesOfMoneySchema.virtual("availableCreditLimit").get(function (this: ISourcesOfMoney) {
  if (this.type !== SourcesOfMoneyType.CREDIT_CARD || !this.creditDetails) {
    return null;
  }
  const { creditLimit = 0, currentDebt = 0 } = this.creditDetails;
  return Math.max(0, creditLimit - currentDebt);
});

sourcesOfMoneySchema.index({ userId: 1, sortOrder: 1 });

export const modelSourcesOfMoneyName = "sourcesOfMoney";
const SourcesOfMoneyModel =
  models[modelSourcesOfMoneyName] ||
  model<ISourcesOfMoney>(modelSourcesOfMoneyName, sourcesOfMoneySchema);

export default SourcesOfMoneyModel;