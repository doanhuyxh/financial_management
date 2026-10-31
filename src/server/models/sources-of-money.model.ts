import { Schema, model, models, Document, Types } from "mongoose";
import { modelUserName } from "./users.model";
import {
  AnnualFeeWaiverPeriod,
  SourcesOfMoneyType,
  type IBankAccount,
} from "@/libs/interfaces/sourcesOfMoneyData";

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
    annualFee?: number;      // Phí thường niên ước tính
    annualFeeDay?: number;   // Ngày thu phí thường niên (1 - 31)
    annualFeeMonth?: number; // Tháng thu phí thường niên (1 - 12)
    annualFeeWaiverPeriod?: AnnualFeeWaiverPeriod; // Kỳ tính chi tiêu để miễn phí thường niên
    annualFeeWaiverMinSpend?: number;              // Chi tiêu tối thiểu trong kỳ
    managementFee?: number;                        // Phí quản lý ước tính mỗi tháng
    managementFeeDay?: number;                     // Ngày thu phí quản lý (1 - 31)
    managementFeeWaiverMinTransactions?: number;   // Số giao dịch tối thiểu/kỳ sao kê để miễn phí quản lý
    managementFeeWaiverMinSpend?: number;          // Hoặc chi tiêu tối thiểu/kỳ sao kê để miễn phí quản lý
    paymentFee?: number;                           // Phí mỗi lần trả nợ thẻ vượt số lần miễn phí
    freePaymentsPerCycle?: number;                 // Số lần trả nợ miễn phí mỗi kỳ sao kê
    interestRate?: number;                         // Lãi suất %/năm
    cashAdvanceFeePercent?: number;                // Phí rút tiền mặt (%)
    cashAdvanceFeeMin?: number;                    // Phí rút tiền mặt tối thiểu
    foreignFxFeePercent?: number;                  // Phí giao dịch ngoại tệ (%)
    foreignFxFeeMin?: number;
    foreignVndFeePercent?: number;                 // Phí giao dịch VND tại ĐV nước ngoài (%)
    foreignVndFeeMin?: number;
    lateFeePercentPerDay?: number;                 // Phí chậm thanh toán (%/ngày)
    lateFeeMin?: number;
    lateFeeMax?: number;
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
      annualFee: { type: Number, min: 0 },
      annualFeeDay: { type: Number, min: 1, max: 31 },
      annualFeeMonth: { type: Number, min: 1, max: 12 },
      annualFeeWaiverPeriod: { type: String, enum: Object.values(AnnualFeeWaiverPeriod) },
      annualFeeWaiverMinSpend: { type: Number, min: 0 },
      managementFee: { type: Number, min: 0 },
      managementFeeDay: { type: Number, min: 1, max: 31 },
      managementFeeWaiverMinTransactions: { type: Number, min: 1 },
      managementFeeWaiverMinSpend: { type: Number, min: 0 },
      paymentFee: { type: Number, min: 0 },
      freePaymentsPerCycle: { type: Number, min: 0 },
      interestRate: { type: Number, min: 0, max: 100 },
      cashAdvanceFeePercent: { type: Number, min: 0, max: 100 },
      cashAdvanceFeeMin: { type: Number, min: 0 },
      foreignFxFeePercent: { type: Number, min: 0, max: 100 },
      foreignFxFeeMin: { type: Number, min: 0 },
      foreignVndFeePercent: { type: Number, min: 0, max: 100 },
      foreignVndFeeMin: { type: Number, min: 0 },
      lateFeePercentPerDay: { type: Number, min: 0, max: 100 },
      lateFeeMin: { type: Number, min: 0 },
      lateFeeMax: { type: Number, min: 0 },
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