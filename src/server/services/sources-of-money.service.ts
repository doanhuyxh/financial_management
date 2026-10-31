import mongoose from "mongoose";
import dayjs from "dayjs";
import dbConnect from "@/server/connectDb";
import SourcesOfMoneyModel from "@/server/models/sources-of-money.model";
import ExpensesModel from "@/server/models/expenses.model";
import IncomesModel from "@/server/models/incomes.model";
import TransfersModel from "@/server/models/transfers.model";
import BalanceAdjustmentsModel from "@/server/models/balance-adjustments.model";
import { BalanceAdjustmentField } from "@/libs/interfaces/balanceAdjustmentsData";
import type { IDefaultQuery } from "@/libs/interfaces/DefaultQuery";
import {
    AnnualFeeWaiverPeriod,
    type ICreditCardFeeProgress,
    type ICreditDetails,
    IFromSourcesOfMoneyData,
    IPaginatedSourcesOfMoneyQuery,
    IReorderSourcesOfMoneyData,
    SourcesOfMoneyType,
} from "@/libs/interfaces/sourcesOfMoneyData";
import {
    errorResponseWithStatusCode,
    successResponse,
    successResponsePageNation,
    unauthorizedResponse,
} from "../utils/responseServer";
import { getCurrentUser } from "../utils/getCurrentUser";
import { escapeRegex } from "../utils/escapeRegex";
import { normalizePagination } from "../utils/pagination";
import { NOT_ARCHIVED } from "../utils/archived";
import { getTrackedAmount } from "@/libs/utils/trackedAmount";
import { normalizeAccountName } from "@/libs/utils/vietQr";
import { getNextAnnualDate } from "@/libs/utils/annualFeeDate";
import { getStatementCycle } from "@/libs/utils/statementCycle";

function normalizePayload(data: IFromSourcesOfMoneyData) {
    const name = data.name?.trim();
    const type = data.type;

    if (!name) {
        throw new Error("Tên nguồn tiền là bắt buộc");
    }
    if (!type || !Object.values(SourcesOfMoneyType).includes(type)) {
        throw new Error("Loại nguồn tiền không hợp lệ");
    }

    if (type === SourcesOfMoneyType.CREDIT_CARD) {
        const creditLimit = Number(data.creditDetails?.creditLimit ?? 0);
        const currentDebt = Number(data.creditDetails?.currentDebt ?? 0);
        const statementDate = data.creditDetails?.statementDate;
        const dueDate = data.creditDetails?.dueDate;

        if (creditLimit < 0 || currentDebt < 0) {
            throw new Error("Hạn mức và dư nợ phải >= 0");
        }
        if (currentDebt > creditLimit) {
            throw new Error("Dư nợ không được lớn hơn hạn mức");
        }
        if (
            statementDate != null &&
            (statementDate < 1 || statementDate > 31)
        ) {
            throw new Error("Ngày sao kê phải từ 1 đến 31");
        }
        if (dueDate != null && (dueDate < 1 || dueDate > 31)) {
            throw new Error("Ngày đến hạn phải từ 1 đến 31");
        }
        const fees = normalizeCardFees(data.creditDetails);

        return {
            name,
            type,
            balance: 0,
            creditDetails: {
                creditLimit,
                currentDebt,
                ...(statementDate != null ? { statementDate } : {}),
                ...(dueDate != null ? { dueDate } : {}),
                ...Object.fromEntries(
                    Object.entries(fees).filter(([, value]) => value != null),
                ),
            },
            bankAccount: undefined,
            metadata: data.metadata ?? {},
        };
    }

    const balance = Number(data.balance ?? 0);
    if (Number.isNaN(balance) || balance < 0) {
        throw new Error("Số dư phải là số >= 0");
    }

    return {
        name,
        type,
        balance,
        creditDetails: undefined,
        bankAccount:
            type === SourcesOfMoneyType.BANK ? normalizeBankAccount(data.bankAccount) : undefined,
        metadata: data.metadata ?? {},
    };
}

/** Tỷ lệ % (0–100, giữ 2 chữ số thập phân). */
const CARD_RATE_KEYS = [
    "interestRate",
    "cashAdvanceFeePercent",
    "foreignFxFeePercent",
    "foreignVndFeePercent",
    "lateFeePercentPerDay",
] as const;

/** Số tiền ≥ 0, làm tròn. */
const CARD_MONEY_KEYS = [
    "cashAdvanceFeeMin",
    "foreignFxFeeMin",
    "foreignVndFeeMin",
    "lateFeeMin",
    "lateFeeMax",
] as const;

const CARD_RATE_LABELS: Record<(typeof CARD_RATE_KEYS)[number], string> = {
    interestRate: "Lãi suất",
    cashAdvanceFeePercent: "Phí rút tiền mặt",
    foreignFxFeePercent: "Phí giao dịch ngoại tệ",
    foreignVndFeePercent: "Phí giao dịch VND tại đơn vị nước ngoài",
    lateFeePercentPerDay: "Phí chậm thanh toán",
};

const CARD_FEE_KEYS = [
    "annualFee",
    "annualFeeDay",
    "annualFeeMonth",
    "annualFeeWaiverPeriod",
    "annualFeeWaiverMinSpend",
    "managementFee",
    "managementFeeDay",
    "managementFeeWaiverMinTransactions",
    "managementFeeWaiverMinSpend",
    "paymentFee",
    "freePaymentsPerCycle",
    ...CARD_RATE_KEYS,
    ...CARD_MONEY_KEYS,
] as const;

function optionalNumber(value: unknown) {
    if (value == null || value === "") return undefined;
    return Number(value);
}

/**
 * Phí thẻ chỉ là ước tính. Ngày và tháng thu phí thường niên đi cùng nhau;
 * kỳ và mức chi tiêu tối thiểu để miễn phí thường niên cũng vậy.
 */
function normalizeCardFees(data: IFromSourcesOfMoneyData["creditDetails"]) {
    const annualFee = optionalNumber(data?.annualFee);
    const annualFeeDay = optionalNumber(data?.annualFeeDay);
    const annualFeeMonth = optionalNumber(data?.annualFeeMonth);
    const annualFeeWaiverPeriod = data?.annualFeeWaiverPeriod || undefined;
    const annualFeeWaiverMinSpend = optionalNumber(data?.annualFeeWaiverMinSpend);
    const managementFee = optionalNumber(data?.managementFee);
    const managementFeeDay = optionalNumber(data?.managementFeeDay);
    const managementFeeWaiverMinTransactions = optionalNumber(
        data?.managementFeeWaiverMinTransactions,
    );
    const managementFeeWaiverMinSpend = optionalNumber(data?.managementFeeWaiverMinSpend);
    const paymentFee = optionalNumber(data?.paymentFee);
    const freePaymentsPerCycle = optionalNumber(data?.freePaymentsPerCycle);

    const isMoney = (value: number) => Number.isFinite(value) && value >= 0;
    if (annualFee != null && !isMoney(annualFee)) {
        throw new Error("Phí thường niên phải >= 0");
    }
    if ((annualFeeDay == null) !== (annualFeeMonth == null)) {
        throw new Error("Cần nhập đủ ngày và tháng thu phí thường niên");
    }
    if (annualFeeDay != null && annualFeeMonth != null) {
        if (!Number.isInteger(annualFeeMonth) || annualFeeMonth < 1 || annualFeeMonth > 12) {
            throw new Error("Tháng thu phí thường niên phải từ 1 đến 12");
        }
        // Năm nhuận để chấp nhận 29/02; năm thường sẽ thu vào ngày cuối tháng
        const maxDay = new Date(2024, annualFeeMonth, 0).getDate();
        if (!Number.isInteger(annualFeeDay) || annualFeeDay < 1 || annualFeeDay > maxDay) {
            throw new Error("Ngày thu phí thường niên không hợp lệ");
        }
    }
    if (
        annualFeeWaiverPeriod != null &&
        !Object.values(AnnualFeeWaiverPeriod).includes(annualFeeWaiverPeriod)
    ) {
        throw new Error("Kỳ miễn phí thường niên không hợp lệ");
    }
    if ((annualFeeWaiverPeriod == null) !== (annualFeeWaiverMinSpend == null)) {
        throw new Error("Cần nhập đủ kỳ và mức chi tiêu tối thiểu để miễn phí thường niên");
    }
    if (
        annualFeeWaiverMinSpend != null &&
        !(Number.isFinite(annualFeeWaiverMinSpend) && annualFeeWaiverMinSpend > 0)
    ) {
        throw new Error("Chi tiêu tối thiểu để miễn phí thường niên phải > 0");
    }
    if (managementFee != null && !isMoney(managementFee)) {
        throw new Error("Phí quản lý phải >= 0");
    }
    if (
        managementFeeDay != null &&
        (!Number.isInteger(managementFeeDay) || managementFeeDay < 1 || managementFeeDay > 31)
    ) {
        throw new Error("Ngày thu phí quản lý phải từ 1 đến 31");
    }
    if (
        managementFeeWaiverMinTransactions != null &&
        (!Number.isInteger(managementFeeWaiverMinTransactions) ||
            managementFeeWaiverMinTransactions < 1)
    ) {
        throw new Error("Số giao dịch tối thiểu để miễn phí quản lý phải là số nguyên >= 1");
    }
    if (
        managementFeeWaiverMinSpend != null &&
        !(Number.isFinite(managementFeeWaiverMinSpend) && managementFeeWaiverMinSpend > 0)
    ) {
        throw new Error("Chi tiêu tối thiểu để miễn phí quản lý phải > 0");
    }
    if (paymentFee != null && !isMoney(paymentFee)) {
        throw new Error("Phí thanh toán dư nợ phải >= 0");
    }
    if (
        freePaymentsPerCycle != null &&
        (!Number.isInteger(freePaymentsPerCycle) || freePaymentsPerCycle < 0)
    ) {
        throw new Error("Số lần trả nợ miễn phí phải là số nguyên >= 0");
    }
    if (freePaymentsPerCycle != null && paymentFee == null) {
        throw new Error("Cần nhập phí thanh toán dư nợ khi đặt số lần miễn phí");
    }

    const rates: Partial<Record<(typeof CARD_RATE_KEYS)[number], number>> = {};
    for (const key of CARD_RATE_KEYS) {
        const value = optionalNumber(data?.[key]);
        if (value == null) continue;
        if (!Number.isFinite(value) || value < 0 || value > 100) {
            throw new Error(`${CARD_RATE_LABELS[key]} phải từ 0 đến 100%`);
        }
        rates[key] = Math.round(value * 100) / 100;
    }
    const minimums: Partial<Record<(typeof CARD_MONEY_KEYS)[number], number>> = {};
    for (const key of CARD_MONEY_KEYS) {
        const value = optionalNumber(data?.[key]);
        if (value == null) continue;
        if (!isMoney(value)) throw new Error("Phí tối thiểu/tối đa phải >= 0");
        minimums[key] = Math.round(value);
    }
    if (
        minimums.lateFeeMin != null &&
        minimums.lateFeeMax != null &&
        minimums.lateFeeMin > minimums.lateFeeMax
    ) {
        throw new Error("Phí chậm thanh toán tối thiểu không được lớn hơn tối đa");
    }

    return {
        annualFee: annualFee != null ? Math.round(annualFee) : undefined,
        annualFeeDay,
        annualFeeMonth,
        annualFeeWaiverPeriod,
        annualFeeWaiverMinSpend:
            annualFeeWaiverMinSpend != null ? Math.round(annualFeeWaiverMinSpend) : undefined,
        managementFee: managementFee != null ? Math.round(managementFee) : undefined,
        managementFeeDay,
        managementFeeWaiverMinTransactions,
        managementFeeWaiverMinSpend:
            managementFeeWaiverMinSpend != null
                ? Math.round(managementFeeWaiverMinSpend)
                : undefined,
        paymentFee: paymentFee != null ? Math.round(paymentFee) : undefined,
        freePaymentsPerCycle,
        ...rates,
        ...minimums,
    };
}

/** Bỏ trống số tài khoản = không lưu tài khoản (không tạo được mã QR). */
function normalizeBankAccount(data: IFromSourcesOfMoneyData["bankAccount"]) {
    const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
    const accountNumber = text(data?.accountNumber);
    if (!accountNumber) return undefined;

    const bin = text(data?.bin);
    const bankName = text(data?.bankName);
    if (!/^\d{6}$/.test(bin) || !bankName) {
        throw new Error("Ngân hàng không hợp lệ");
    }
    if (!/^[0-9A-Za-z]{1,19}$/.test(accountNumber)) {
        throw new Error("Số tài khoản chỉ gồm chữ/số, tối đa 19 ký tự");
    }
    const accountName = normalizeAccountName(text(data?.accountName)).slice(0, 50);

    return {
        bin,
        bankName: bankName.slice(0, 100),
        accountNumber,
        ...(accountName ? { accountName } : {}),
    };
}

async function hasTransactions(userId: string, sourceId: string) {
    const [expense, income, transfer] = await Promise.all([
        ExpensesModel.exists({ userId, sourceOfMoneyId: sourceId }),
        IncomesModel.exists({ userId, sourceOfMoneyId: sourceId }),
        TransfersModel.exists({
            userId,
            $or: [{ fromSourceId: sourceId }, { toSourceId: sourceId }],
        }),
    ]);
    return Boolean(expense || income || transfer);
}

const ADJUSTMENT_NOTE_MAX = 200;
const TIMEZONE = "Asia/Ho_Chi_Minh";

/** Hôm nay theo giờ VN dạng YYYY-MM-DD, không phụ thuộc TZ của server. */
function getTodayInVietnam() {
    return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(new Date());
}

/** 00:00 giờ VN của ngày YYYY-MM-DD. */
function startOfVietnamDay(date: string) {
    return new Date(`${date}T00:00:00.000+07:00`);
}

type ExistingSource = {
    type: SourcesOfMoneyType;
    balance?: number;
    creditDetails?: { currentDebt?: number };
};

function getTrackedPath(type: SourcesOfMoneyType) {
    return type === SourcesOfMoneyType.CREDIT_CARD ? "creditDetails.currentDebt" : "balance";
}

function getAdjustmentField(type: SourcesOfMoneyType) {
    return type === SourcesOfMoneyType.CREDIT_CARD
        ? BalanceAdjustmentField.CREDIT_DEBT
        : BalanceAdjustmentField.BALANCE;
}

function normalizeAdjustmentNote(note: unknown) {
    return typeof note === "string" ? note.trim().slice(0, ADJUSTMENT_NOTE_MAX) : "";
}

export class SourcesOfMoneyService {
    static async getSourcesOfMoney(query: IPaginatedSourcesOfMoneyQuery) {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) {
            return unauthorizedResponse();
        }

        const { search = "", type } = query;
        const { page, limit } = normalizePagination(query.page, query.limit, 100);
        const filter: Record<string, unknown> = { userId: user.userId, ...NOT_ARCHIVED };

        if (search) {
            filter.name = { $regex: escapeRegex(search), $options: "i" };
        }
        if (type) {
            filter.type = type;
        }

        // Backfill sortOrder for legacy documents
        const missingSortOrder = await SourcesOfMoneyModel.countDocuments({
            userId: user.userId,
            $or: [{ sortOrder: { $exists: false } }, { sortOrder: null }],
        });
        if (missingSortOrder > 0) {
            const all = await SourcesOfMoneyModel.find({ userId: user.userId })
                .sort({ createdAt: 1 })
                .select("_id");
            await Promise.all(
                all.map((doc, index) =>
                    SourcesOfMoneyModel.updateOne(
                        { _id: doc._id },
                        { $set: { sortOrder: index } },
                    ),
                ),
            );
        }

        const [docs, total] = await Promise.all([
            SourcesOfMoneyModel.find(filter)
                .skip((page - 1) * limit)
                .limit(limit)
                .sort({ sortOrder: 1, createdAt: 1 }),
            SourcesOfMoneyModel.countDocuments(filter),
        ]);

        const items = docs.map((doc) => doc.toJSON());
        return successResponsePageNation(items, total, page, limit);
    }

    static async createSourcesOfMoney(data: IFromSourcesOfMoneyData) {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) {
            return unauthorizedResponse();
        }

        try {
            const payload = normalizePayload(data);
            const last = await SourcesOfMoneyModel.findOne({ userId: user.userId })
                .sort({ sortOrder: -1 })
                .select("sortOrder")
                .lean();
            const sortOrder = (last?.sortOrder ?? -1) + 1;

            const created = await SourcesOfMoneyModel.create({
                ...payload,
                sortOrder,
                userId: user.userId,
            });

            // Ghi số dư/dư nợ ban đầu để lịch sử điều chỉnh đối chiếu được từ 0
            const initialAmount = getTrackedAmount(payload);
            if (initialAmount !== 0) {
                try {
                    await BalanceAdjustmentsModel.create({
                        userId: user.userId,
                        sourceOfMoneyId: created._id,
                        field: getAdjustmentField(payload.type),
                        previousValue: 0,
                        newValue: initialAmount,
                        delta: initialAmount,
                        note: normalizeAdjustmentNote(data.adjustmentNote) || "Số dư ban đầu",
                    });
                } catch (adjustmentError) {
                    await SourcesOfMoneyModel.deleteOne({ _id: created._id, userId: user.userId });
                    throw adjustmentError;
                }
            }

            return successResponse(created.toJSON(), "Tạo nguồn tiền thành công");
        } catch (error: unknown) {
            const message =
                error instanceof Error ? error.message : "Tạo nguồn tiền thất bại";
            return errorResponseWithStatusCode(message, 400);
        }
    }

    static async updateSourcesOfMoney(id: string, data: IFromSourcesOfMoneyData) {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) {
            return unauthorizedResponse();
        }

        try {
            const payload = normalizePayload(data);

            const existing = await SourcesOfMoneyModel.findOne({
                _id: id,
                userId: user.userId,
                ...NOT_ARCHIVED,
            })
                .select("type balance creditDetails")
                .lean<ExistingSource>();
            if (!existing) {
                return errorResponseWithStatusCode("Không tìm thấy nguồn tiền", 404);
            }

            // Loại cố định sau khi tạo: logic số dư/dư nợ và lịch sử phụ thuộc vào loại
            if (payload.type !== existing.type) {
                return errorResponseWithStatusCode("Không được đổi loại nguồn tiền", 400);
            }
            const isCreditCard = payload.type === SourcesOfMoneyType.CREDIT_CARD;

            const newAmount = getTrackedAmount(payload);
            const expected = Number(data.expectedAmount);
            const expectedAmount =
                data.expectedAmount != null && Number.isFinite(expected)
                    ? expected
                    : getTrackedAmount(existing);
            // Người dùng không sửa số này → giữ số trong DB (có thể đã đổi do giao dịch khác)
            const amountChanged = newAmount !== expectedAmount;
            const trackedPath = getTrackedPath(payload.type);

            const filter: Record<string, unknown> = {
                _id: id,
                userId: user.userId,
                type: existing.type,
                ...NOT_ARCHIVED,
            };
            const $set: Record<string, unknown> = {
                name: payload.name,
                metadata: payload.metadata,
            };
            const $unset: Record<string, 1> = {};

            if (payload.creditDetails) {
                const { creditLimit, statementDate, dueDate } = payload.creditDetails;
                $set["creditDetails.creditLimit"] = creditLimit;
                if (statementDate != null) $set["creditDetails.statementDate"] = statementDate;
                else $unset["creditDetails.statementDate"] = 1;
                if (dueDate != null) $set["creditDetails.dueDate"] = dueDate;
                else $unset["creditDetails.dueDate"] = 1;
                for (const key of CARD_FEE_KEYS) {
                    const value = (payload.creditDetails as Partial<ICreditDetails>)[key];
                    if (value != null) $set[`creditDetails.${key}`] = value;
                    else $unset[`creditDetails.${key}`] = 1;
                }
                if (!amountChanged) {
                    // Giữ dư nợ hiện tại: hạn mức mới không được thấp hơn nó
                    // `$not: $gt` cũng khớp thẻ cũ thiếu currentDebt (coi như 0)
                    filter["creditDetails.currentDebt"] = { $not: { $gt: creditLimit } };
                }
            }
            if (payload.bankAccount) $set.bankAccount = payload.bankAccount;
            else $unset.bankAccount = 1;
            if (amountChanged) {
                $set[trackedPath] = newAmount;
                filter[trackedPath] = expectedAmount;
            }

            const updated = await SourcesOfMoneyModel.findOneAndUpdate(
                filter,
                Object.keys($unset).length > 0 ? { $set, $unset } : { $set },
                { returnDocument: "after" },
            );

            if (!updated) {
                if (amountChanged) {
                    return errorResponseWithStatusCode(
                        `${isCreditCard ? "Dư nợ" : "Số dư"} vừa thay đổi do giao dịch khác. Hãy tải lại và thử lại`,
                        409,
                    );
                }
                if (isCreditCard && !amountChanged) {
                    return errorResponseWithStatusCode(
                        "Hạn mức mới không được thấp hơn dư nợ hiện tại",
                        400,
                    );
                }
                return errorResponseWithStatusCode("Không tìm thấy nguồn tiền", 404);
            }

            if (amountChanged) {
                try {
                    await BalanceAdjustmentsModel.create({
                        userId: user.userId,
                        sourceOfMoneyId: updated._id,
                        field: getAdjustmentField(payload.type),
                        previousValue: expectedAmount,
                        newValue: newAmount,
                        delta: newAmount - expectedAmount,
                        note: normalizeAdjustmentNote(data.adjustmentNote),
                    });
                } catch (adjustmentError) {
                    await SourcesOfMoneyModel.updateOne(
                        { _id: id, userId: user.userId, [trackedPath]: newAmount },
                        { $set: { [trackedPath]: expectedAmount } },
                    );
                    throw adjustmentError;
                }
            }

            return successResponse(updated.toJSON(), "Cập nhật nguồn tiền thành công");
        } catch (error: unknown) {
            const message =
                error instanceof Error ? error.message : "Cập nhật nguồn tiền thất bại";
            return errorResponseWithStatusCode(message, 400);
        }
    }

    /**
     * Tiến độ điều kiện miễn phí của các thẻ có cấu hình miễn phí hoặc phí thanh toán: chi tiêu,
     * số giao dịch và số lần trả nợ trong kỳ sao kê hiện tại (`getStatementCycle`), chi tiêu trong năm thẻ (12 tháng trước lần thu phí thường niên kế tiếp;
     * thẻ chưa đặt ngày thu thì tính theo năm dương lịch). Không tính phí chuyển tiền
     * (`skipBalanceAdjust`) và các khoản phí thẻ (`cardFeeType`).
     */
    static async getCreditCardFeeProgress() {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) {
            return unauthorizedResponse();
        }

        const cards = await SourcesOfMoneyModel.find({
            userId: user.userId,
            type: SourcesOfMoneyType.CREDIT_CARD,
            ...NOT_ARCHIVED,
            $or: [
                { "creditDetails.annualFeeWaiverPeriod": { $exists: true } },
                { "creditDetails.managementFeeWaiverMinTransactions": { $exists: true } },
                { "creditDetails.managementFeeWaiverMinSpend": { $exists: true } },
                { "creditDetails.paymentFee": { $exists: true } },
            ],
        })
            .select("creditDetails")
            .lean<{ _id: mongoose.Types.ObjectId; creditDetails?: ICreditDetails }[]>();

        const today = dayjs(getTodayInVietnam());
        const userObjectId = new mongoose.Types.ObjectId(user.userId);
        const toVietnamDay = (date: dayjs.Dayjs) => startOfVietnamDay(date.format("YYYY-MM-DD"));

        const items: ICreditCardFeeProgress[] = await Promise.all(
            cards.map(async (card) => {
                const { annualFeeDay, annualFeeMonth, statementDate } = card.creditDetails ?? {};
                let yearStart = startOfVietnamDay(`${today.year()}-01-01`);
                let yearEnd = startOfVietnamDay(`${today.year() + 1}-01-01`);
                if (annualFeeDay && annualFeeMonth) {
                    const nextFee = getNextAnnualDate(annualFeeDay, annualFeeMonth, today);
                    yearEnd = toVietnamDay(nextFee);
                    yearStart = toVietnamDay(nextFee.subtract(1, "year"));
                }
                const cycle = getStatementCycle(statementDate, today);
                const cycleStart = toVietnamDay(cycle.start);
                const cycleEnd = toVietnamDay(cycle.end);

                const inCycle = {
                    $and: [{ $gte: ["$spentAt", cycleStart] }, { $lt: ["$spentAt", cycleEnd] }],
                };
                const inYear = {
                    $and: [{ $gte: ["$spentAt", yearStart] }, { $lt: ["$spentAt", yearEnd] }],
                };
                const [[row], transferPayments, incomePayments] = await Promise.all([
                    ExpensesModel.aggregate<{
                        cycleSpend: number;
                        cycleTransactions: number;
                        yearSpend: number;
                    }>([
                        {
                            $match: {
                                userId: userObjectId,
                                sourceOfMoneyId: card._id,
                                skipBalanceAdjust: { $ne: true },
                                cardFeeType: null,
                                spentAt: {
                                    $gte: cycleStart < yearStart ? cycleStart : yearStart,
                                    $lt: cycleEnd > yearEnd ? cycleEnd : yearEnd,
                                },
                            },
                        },
                        {
                            $group: {
                                _id: null,
                                cycleSpend: { $sum: { $cond: [inCycle, "$amount", 0] } },
                                cycleTransactions: { $sum: { $cond: [inCycle, 1, 0] } },
                                yearSpend: { $sum: { $cond: [inYear, "$amount", 0] } },
                            },
                        },
                    ]),
                    // Trả nợ thẻ = chuyển tiền vào thẻ hoặc thu nhập vào thẻ
                    TransfersModel.countDocuments({
                        userId: user.userId,
                        toSourceId: card._id,
                        transferredAt: { $gte: cycleStart, $lt: cycleEnd },
                    }),
                    IncomesModel.countDocuments({
                        userId: user.userId,
                        sourceOfMoneyId: card._id,
                        receivedAt: { $gte: cycleStart, $lt: cycleEnd },
                    }),
                ]);

                return {
                    sourceOfMoneyId: card._id.toString(),
                    cycleStart: cycleStart.toISOString(),
                    cycleEnd: cycleEnd.toISOString(),
                    cycleSpend: row?.cycleSpend ?? 0,
                    cycleTransactions: row?.cycleTransactions ?? 0,
                    cyclePayments: transferPayments + incomePayments,
                    yearSpend: row?.yearSpend ?? 0,
                    yearStart: yearStart.toISOString(),
                    yearEnd: yearEnd.toISOString(),
                };
            }),
        );

        return successResponse(items);
    }

    static async reorderSourcesOfMoney(data: IReorderSourcesOfMoneyData) {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) {
            return unauthorizedResponse();
        }

        const orderedIds = data.orderedIds ?? [];
        if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
            return errorResponseWithStatusCode("Danh sách thứ tự không hợp lệ", 400);
        }

        const [owned, totalOwned] = await Promise.all([
            SourcesOfMoneyModel.find({
                userId: user.userId,
                _id: { $in: orderedIds },
                ...NOT_ARCHIVED,
            }).select("_id"),
            SourcesOfMoneyModel.countDocuments({ userId: user.userId, ...NOT_ARCHIVED }),
        ]);

        if (owned.length !== orderedIds.length) {
            return errorResponseWithStatusCode(
                "Một số nguồn tiền không tồn tại hoặc không thuộc về bạn",
                400,
            );
        }
        if (orderedIds.length !== totalOwned) {
            return errorResponseWithStatusCode(
                "Cần gửi đầy đủ danh sách nguồn tiền để sắp xếp",
                400,
            );
        }

        await Promise.all(
            orderedIds.map((id, index) =>
                SourcesOfMoneyModel.updateOne(
                    { _id: id, userId: user.userId },
                    { $set: { sortOrder: index } },
                ),
            ),
        );

        return successResponse(null, "Cập nhật thứ tự nguồn tiền thành công");
    }

    static async getBalanceAdjustments(sourceId: string, query: IDefaultQuery) {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) {
            return unauthorizedResponse();
        }

        // Nguồn đã lưu trữ vẫn xem được lịch sử
        const source = await SourcesOfMoneyModel.exists({ _id: sourceId, userId: user.userId });
        if (!source) {
            return errorResponseWithStatusCode("Không tìm thấy nguồn tiền", 404);
        }

        const { page, limit } = normalizePagination(query.page, query.limit, 10);
        const filter = { userId: user.userId, sourceOfMoneyId: sourceId };
        const [items, total] = await Promise.all([
            BalanceAdjustmentsModel.find(filter)
                .sort({ adjustedAt: -1, createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            BalanceAdjustmentsModel.countDocuments(filter),
        ]);

        return successResponsePageNation(items, total, page, limit);
    }

    static async deleteSourcesOfMoney(id: string) {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) {
            return unauthorizedResponse();
        }

        const filter = { _id: id, userId: user.userId, ...NOT_ARCHIVED };

        // Đã có giao dịch thì chỉ lưu trữ để lịch sử vẫn hiển thị tên nguồn tiền
        if (await hasTransactions(user.userId, id)) {
            // Số dư/dư nợ phải về 0 (điều kiện nằm trong filter để tránh race),
            // nếu không tài sản sẽ biến mất khỏi dashboard
            const archived = await SourcesOfMoneyModel.findOneAndUpdate(
                {
                    ...filter,
                    $or: [
                        { type: { $ne: SourcesOfMoneyType.CREDIT_CARD }, balance: 0 },
                        {
                            type: SourcesOfMoneyType.CREDIT_CARD,
                            "creditDetails.currentDebt": { $in: [0, null] },
                        },
                    ],
                },
                { $set: { archivedAt: new Date() } },
            );
            if (archived) {
                return successResponse(null, "Đã xóa nguồn tiền (lịch sử giao dịch vẫn giữ tên)");
            }

            const exists = await SourcesOfMoneyModel.exists(filter);
            if (!exists) {
                return errorResponseWithStatusCode("Không tìm thấy nguồn tiền", 404);
            }
            return errorResponseWithStatusCode(
                "Nguồn tiền còn số dư hoặc dư nợ. Hãy chuyển hết hoặc điều chỉnh về 0 trước khi xóa",
                400,
            );
        }

        const deleted = await SourcesOfMoneyModel.findOneAndDelete(filter);
        if (!deleted) {
            return errorResponseWithStatusCode("Không tìm thấy nguồn tiền", 404);
        }

        return successResponse(null, "Xóa nguồn tiền thành công");
    }
}
