import mongoose, { type Model } from "mongoose";
import ExpensesModel from "@/server/models/expenses.model";
import IncomesModel from "@/server/models/incomes.model";
import TransfersModel from "@/server/models/transfers.model";
import BalanceAdjustmentsModel from "@/server/models/balance-adjustments.model";
import CardRolloversModel from "@/server/models/card-rollovers.model";
import { SourcesOfMoneyType } from "@/libs/interfaces/sourcesOfMoneyData";

export interface ILedgerParts {
    expense: number;
    income: number;
    transferOut: number;
    /** Phần bên nhận thực nhận: amount − feeAmount */
    transferIn: number;
    adjustment: number;
    rolloverFee: number;
}

type ObjectIdLike = string | mongoose.Types.ObjectId;

const toObjectId = (value: ObjectIdLike) =>
    typeof value === "string" ? new mongoose.Types.ObjectId(value) : value;

async function sumOf(model: Model<any>, match: Record<string, unknown>, expression: unknown) {
    const [row] = await model.aggregate<{ total: number }>([
        { $match: match },
        { $group: { _id: null, total: { $sum: expression } } },
    ]);
    return row?.total ?? 0;
}

/**
 * Số dư (nguồn thường) hoặc dư nợ (thẻ) suy ra từ sổ cái: giao dịch + điều chỉnh + phí đáo hạn.
 * Cùng quy tắc delta với `querySourceTransactions` (source-transactions.service.ts) và bảng trong
 * business/source-history.md — sửa một chỗ thì sửa cả hai.
 */
export async function computeLedgerBalance(
    userIdValue: ObjectIdLike,
    sourceIdValue: ObjectIdLike,
    sourceType: SourcesOfMoneyType,
) {
    const userId = toObjectId(userIdValue);
    const sourceId = toObjectId(sourceIdValue);

    const [expense, income, transferOut, transferIn, adjustment, rolloverFee] = await Promise.all([
        // Phí chuyển tiền / phí đáo hạn (skipBalanceAdjust) đã nằm trong transfer / đáo hạn gốc
        sumOf(
            ExpensesModel,
            { userId, sourceOfMoneyId: sourceId, skipBalanceAdjust: { $ne: true } },
            "$amount",
        ),
        sumOf(IncomesModel, { userId, sourceOfMoneyId: sourceId }, "$amount"),
        sumOf(TransfersModel, { userId, fromSourceId: sourceId }, "$amount"),
        sumOf(TransfersModel, { userId, toSourceId: sourceId }, {
            $subtract: ["$amount", { $ifNull: ["$feeAmount", 0] }],
        }),
        sumOf(BalanceAdjustmentsModel, { userId, sourceOfMoneyId: sourceId }, "$delta"),
        sumOf(CardRolloversModel, { userId, sourceOfMoneyId: sourceId }, {
            $ifNull: ["$feeAmount", 0],
        }),
    ]);

    const parts: ILedgerParts = { expense, income, transferOut, transferIn, adjustment, rolloverFee };
    const ledger =
        sourceType === SourcesOfMoneyType.CREDIT_CARD
            ? expense - income + transferOut - transferIn + adjustment + rolloverFee
            : income - expense - transferOut + transferIn + adjustment;

    return { ledger, parts };
}

/** Ngày sớm nhất có biến động của nguồn (để đặt mốc số dư ban đầu bổ sung trước nó). */
export async function findEarliestMovement(userIdValue: ObjectIdLike, sourceIdValue: ObjectIdLike) {
    const userId = toObjectId(userIdValue);
    const sourceId = toObjectId(sourceIdValue);
    const earliest = async (model: Model<any>, match: Record<string, unknown>, field: string) => {
        const doc = await model.findOne(match).sort({ [field]: 1 }).select(field).lean<Record<string, Date>>();
        return doc?.[field] ?? null;
    };
    const dates = await Promise.all([
        earliest(ExpensesModel, { userId, sourceOfMoneyId: sourceId }, "spentAt"),
        earliest(IncomesModel, { userId, sourceOfMoneyId: sourceId }, "receivedAt"),
        earliest(TransfersModel, { userId, $or: [{ fromSourceId: sourceId }, { toSourceId: sourceId }] }, "transferredAt"),
        earliest(BalanceAdjustmentsModel, { userId, sourceOfMoneyId: sourceId }, "adjustedAt"),
        earliest(CardRolloversModel, { userId, sourceOfMoneyId: sourceId }, "rolledAt"),
    ]);
    const valid = dates.filter((date): date is Date => date instanceof Date);
    return valid.length ? new Date(Math.min(...valid.map((date) => date.getTime()))) : null;
}
