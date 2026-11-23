import mongoose from "mongoose";
import dbConnect from "@/server/connectDb";
import PlannedExpensesModel from "@/server/models/planned-expenses.model";
import ExpensesModel from "@/server/models/expenses.model";
import CategoriesModel from "@/server/models/categories.model";
import SourcesOfMoneyModel from "@/server/models/sources-of-money.model";
import { CategoryKind } from "@/libs/interfaces/categoriesData";
import { SourcesOfMoneyType } from "@/libs/interfaces/sourcesOfMoneyData";
import {
    PlannedExpenseStatus,
    type IFromPlannedExpensesData,
    type IPlannedExpensesQuery,
} from "@/libs/interfaces/plannedExpensesData";
import {
    errorResponseWithStatusCode,
    successResponse,
    unauthorizedResponse,
} from "../utils/responseServer";
import { getCurrentUser } from "../utils/getCurrentUser";
import { parseMoney } from "../utils/money";
import { normalizeDay, vietnamDayKey } from "../utils/dayRange";
import { safeRollback } from "../utils/safeRollback";
import { assertLedgerUnlocked } from "../utils/ledgerLock";
import { releaseOnSource, reserveOnSource } from "../utils/reservation";

/**
 * Chi dự kiến: giữ chỗ tiền trên nguồn (`reservedAmount`), không đụng số dư/dư nợ và không thuộc
 * sổ cái. Chỉ thành chi tiêu khi người dùng bấm Xác nhận (từ ngày dự kiến trở đi); Hủy thì bỏ giữ chỗ.
 * Không dùng Mongo transaction: mỗi bước có bù trừ thủ công qua `safeRollback`, giữ nguyên thứ tự.
 */

const NOTE_MAX_LENGTH = 500;
/** Lên kế hoạch xa nhất ~5 năm */
const MAX_PLAN_DAYS = 5 * 366;
const DAY_MS = 24 * 60 * 60 * 1000;

const NOT_FOUND = "Không tìm thấy khoản chi dự kiến";
const NOT_PENDING = "Khoản chi dự kiến đã được xác nhận hoặc hủy";

/** 12:00 giờ VN của ngày YYYY-MM-DD (giống cách MCP quy ngày không có giờ). */
function plannedAtOf(day: string) {
    return new Date(`${day}T12:00:00.000+07:00`);
}

function parsePlannedDate(value: unknown, now = new Date()) {
    const day = normalizeDay(value);
    if (!day) throw new Error("Ngày dự kiến không hợp lệ");
    const today = vietnamDayKey(now);
    if (day <= today) throw new Error("Ngày dự kiến phải sau hôm nay");
    const latest = vietnamDayKey(new Date(now.getTime() + MAX_PLAN_DAYS * DAY_MS));
    if (day > latest) throw new Error("Ngày dự kiến không được quá 5 năm");
    return day;
}

function normalizePayload(data: IFromPlannedExpensesData) {
    const categoryId = data.categoryId?.trim();
    const sourceOfMoneyId = data.sourceOfMoneyId?.trim();
    if (!categoryId) throw new Error("Danh mục là bắt buộc");
    if (!sourceOfMoneyId) throw new Error("Nguồn tiền là bắt buộc");
    const amount = parseMoney(data.amount, "Số tiền");
    const note = (data.note?.trim() || "").slice(0, NOTE_MAX_LENGTH);
    return { categoryId, sourceOfMoneyId, amount, note, plannedDate: data.plannedDate };
}

/** Danh mục chi tiêu đang dùng (giữ nguyên danh mục cũ thì cho qua dù đã lưu trữ). */
async function assertCategory(userId: string, categoryId: string, currentId?: string) {
    const category = await CategoriesModel.findOne({ _id: categoryId, userId })
        .select("_id kind archivedAt")
        .lean<{ kind?: CategoryKind; archivedAt?: Date | null }>();
    if (!category) throw new Error("Không tìm thấy danh mục");
    if (categoryId !== currentId) {
        if (category.archivedAt) throw new Error("Danh mục đã bị xóa");
        if (category.kind && category.kind !== CategoryKind.EXPENSE) {
            throw new Error("Danh mục này dành cho thu nhập, hãy chọn danh mục chi tiêu");
        }
    }
}

function getPopulated(id: string | mongoose.Types.ObjectId, userId: string) {
    return PlannedExpensesModel.findOne({ _id: id, userId })
        .populate("categoryId", "name icon color archivedAt")
        .populate(
            "sourceOfMoneyId",
            "name type balance creditDetails reservedAmount archivedAt",
        )
        .lean();
}

function errorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback;
}

export class PlannedExpensesService {
    static async getPlannedExpenses(query: IPlannedExpensesQuery = {}) {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) return unauthorizedResponse();

        const status = Object.values(PlannedExpenseStatus).includes(
            query.status as PlannedExpenseStatus,
        )
            ? query.status
            : PlannedExpenseStatus.PENDING;
        const pending = status === PlannedExpenseStatus.PENDING;

        const items = await PlannedExpensesModel.find({ userId: user.userId, status })
            .populate("categoryId", "name icon color archivedAt")
            .populate(
                "sourceOfMoneyId",
                "name type balance creditDetails reservedAmount archivedAt",
            )
            // Đang chờ: gần nhất trước; lịch sử: mới nhất trước
            .sort(pending ? { plannedAt: 1, createdAt: 1 } : { updatedAt: -1 })
            .limit(pending ? 200 : 50)
            .lean();

        return successResponse({ items });
    }

    static async createPlannedExpense(data: IFromPlannedExpensesData) {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) return unauthorizedResponse();

        try {
            const payload = normalizePayload(data);
            const plannedDate = parsePlannedDate(payload.plannedDate);
            await assertCategory(user.userId, payload.categoryId);

            await reserveOnSource(user.userId, payload.sourceOfMoneyId, payload.amount);
            try {
                const created = await PlannedExpensesModel.create({
                    userId: user.userId,
                    categoryId: new mongoose.Types.ObjectId(payload.categoryId),
                    sourceOfMoneyId: new mongoose.Types.ObjectId(payload.sourceOfMoneyId),
                    amount: payload.amount,
                    note: payload.note,
                    plannedAt: plannedAtOf(plannedDate),
                    status: PlannedExpenseStatus.PENDING,
                });
                const populated = await getPopulated(created._id, user.userId);
                return successResponse(populated, "Đã tạo khoản chi dự kiến");
            } catch (createError) {
                await safeRollback(
                    {
                        userId: user.userId,
                        sourceOfMoneyId: payload.sourceOfMoneyId,
                        operation: "planned-expense.create",
                        step: "release-reservation",
                        amount: payload.amount,
                        originalError: createError,
                    },
                    () => releaseOnSource(user.userId, payload.sourceOfMoneyId, payload.amount),
                );
                throw createError;
            }
        } catch (error) {
            return errorResponseWithStatusCode(errorMessage(error, "Tạo khoản chi dự kiến thất bại"), 400);
        }
    }

    static async updatePlannedExpense(id: string, data: IFromPlannedExpensesData) {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) return unauthorizedResponse();

        try {
            const existing = await PlannedExpensesModel.findOne({ _id: id, userId: user.userId });
            if (!existing) return errorResponseWithStatusCode(NOT_FOUND, 404);
            if (existing.status !== PlannedExpenseStatus.PENDING) {
                return errorResponseWithStatusCode(NOT_PENDING, 400);
            }

            const payload = normalizePayload(data);
            // Giữ nguyên ngày (kể cả đã tới hạn) thì cho qua; đổi ngày thì phải sau hôm nay
            const oldDay = vietnamDayKey(existing.plannedAt);
            const newDay = normalizeDay(payload.plannedDate);
            const plannedAt =
                newDay === oldDay ? existing.plannedAt : plannedAtOf(parsePlannedDate(payload.plannedDate));
            await assertCategory(user.userId, payload.categoryId, existing.categoryId.toString());

            const oldSourceId = existing.sourceOfMoneyId.toString();
            const oldAmount = existing.amount;
            const sameSource = oldSourceId === payload.sourceOfMoneyId;
            const delta = payload.amount - oldAmount;
            const context = { userId: user.userId, operation: "planned-expense.update" };

            // Cùng nguồn: giữ thêm / bỏ bớt theo chênh lệch. Đổi nguồn: giữ chỗ nguồn mới trước rồi bỏ nguồn cũ.
            if (sameSource) {
                if (delta > 0) await reserveOnSource(user.userId, oldSourceId, delta);
                else if (delta < 0) await releaseOnSource(user.userId, oldSourceId, -delta);
            } else {
                await reserveOnSource(user.userId, payload.sourceOfMoneyId, payload.amount);
                try {
                    await releaseOnSource(user.userId, oldSourceId, oldAmount);
                } catch (releaseError) {
                    await safeRollback(
                        {
                            ...context,
                            sourceOfMoneyId: payload.sourceOfMoneyId,
                            step: "release-new-source",
                            amount: payload.amount,
                            originalError: releaseError,
                        },
                        () => releaseOnSource(user.userId, payload.sourceOfMoneyId, payload.amount),
                    );
                    throw releaseError;
                }
            }

            try {
                // Filter theo status: xác nhận/hủy chen giữa thì không ghi đè
                const updated = await PlannedExpensesModel.findOneAndUpdate(
                    { _id: id, userId: user.userId, status: PlannedExpenseStatus.PENDING },
                    {
                        $set: {
                            categoryId: new mongoose.Types.ObjectId(payload.categoryId),
                            sourceOfMoneyId: new mongoose.Types.ObjectId(payload.sourceOfMoneyId),
                            amount: payload.amount,
                            note: payload.note,
                            plannedAt,
                        },
                    },
                    { returnDocument: "after" },
                );
                if (!updated) throw new Error(NOT_PENDING);
                const populated = await getPopulated(id, user.userId);
                return successResponse(populated, "Đã cập nhật khoản chi dự kiến");
            } catch (updateError) {
                if (sameSource) {
                    if (delta !== 0) {
                        await safeRollback(
                            {
                                ...context,
                                sourceOfMoneyId: oldSourceId,
                                step: "revert-reservation-delta",
                                amount: delta,
                                originalError: updateError,
                            },
                            () =>
                                delta > 0
                                    ? releaseOnSource(user.userId, oldSourceId, delta)
                                    : // Hoàn lại phần đã bỏ: không kiểm tra khả dụng để không mất giữ chỗ
                                      SourcesOfMoneyModel.updateOne(
                                          { _id: oldSourceId, userId: user.userId },
                                          { $inc: { reservedAmount: -delta } },
                                      ),
                        );
                    }
                } else {
                    await safeRollback(
                        {
                            ...context,
                            sourceOfMoneyId: payload.sourceOfMoneyId,
                            step: "release-new-source",
                            amount: payload.amount,
                            originalError: updateError,
                        },
                        () => releaseOnSource(user.userId, payload.sourceOfMoneyId, payload.amount),
                    );
                    await safeRollback(
                        {
                            ...context,
                            sourceOfMoneyId: oldSourceId,
                            step: "re-reserve-old-source",
                            amount: oldAmount,
                            originalError: updateError,
                        },
                        () =>
                            SourcesOfMoneyModel.updateOne(
                                { _id: oldSourceId, userId: user.userId },
                                { $inc: { reservedAmount: oldAmount } },
                            ),
                    );
                }
                throw updateError;
            }
        } catch (error) {
            return errorResponseWithStatusCode(
                errorMessage(error, "Cập nhật khoản chi dự kiến thất bại"),
                400,
            );
        }
    }

    /** Hủy: bỏ giữ chỗ, giữ bản ghi (trạng thái CANCELLED) làm lịch sử. Hủy được bất cứ lúc nào khi còn chờ. */
    static async cancelPlannedExpense(id: string) {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) return unauthorizedResponse();

        try {
            // Chiếm trạng thái trước (atomic) để không hủy hai lần / hủy khi đang xác nhận
            const claimed = await PlannedExpensesModel.findOneAndUpdate(
                { _id: id, userId: user.userId, status: PlannedExpenseStatus.PENDING },
                { $set: { status: PlannedExpenseStatus.CANCELLED, cancelledAt: new Date() } },
                { returnDocument: "after" },
            );
            if (!claimed) {
                const exists = await PlannedExpensesModel.exists({ _id: id, userId: user.userId });
                return errorResponseWithStatusCode(exists ? NOT_PENDING : NOT_FOUND, exists ? 400 : 404);
            }

            const sourceId = claimed.sourceOfMoneyId.toString();
            try {
                await releaseOnSource(user.userId, sourceId, claimed.amount);
            } catch (releaseError) {
                await safeRollback(
                    {
                        userId: user.userId,
                        sourceOfMoneyId: sourceId,
                        operation: "planned-expense.cancel",
                        step: "restore-pending",
                        amount: claimed.amount,
                        originalError: releaseError,
                    },
                    () =>
                        PlannedExpensesModel.updateOne(
                            { _id: id, userId: user.userId },
                            { $set: { status: PlannedExpenseStatus.PENDING, cancelledAt: null } },
                        ),
                );
                throw releaseError;
            }
            return successResponse(null, "Đã hủy khoản chi dự kiến");
        } catch (error) {
            return errorResponseWithStatusCode(errorMessage(error, "Hủy khoản chi dự kiến thất bại"), 400);
        }
    }

    /**
     * Xác nhận (từ ngày dự kiến trở đi): một `$inc` chuyển phần giữ chỗ thành trừ thật
     * (nguồn thường: balance −, reserved −; thẻ: debt +, reserved −), rồi tạo Expense.
     * Ngày chi = ngày dự kiến (12:00), hoặc bây giờ nếu xác nhận sớm hơn 12:00 của chính ngày đó.
     */
    static async confirmPlannedExpense(id: string) {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) return unauthorizedResponse();

        try {
            const existing = await PlannedExpensesModel.findOne({ _id: id, userId: user.userId });
            if (!existing) return errorResponseWithStatusCode(NOT_FOUND, 404);
            if (existing.status !== PlannedExpenseStatus.PENDING) {
                return errorResponseWithStatusCode(NOT_PENDING, 400);
            }
            const now = new Date();
            if (vietnamDayKey(existing.plannedAt) > vietnamDayKey(now)) {
                return errorResponseWithStatusCode(
                    "Chưa tới ngày dự kiến. Muốn chi ngay thì sửa ngày hoặc hủy rồi ghi chi tiêu",
                    400,
                );
            }
            const spentAt = existing.plannedAt.getTime() > now.getTime() ? now : existing.plannedAt;
            await assertLedgerUnlocked(user.userId, spentAt);

            const sourceId = existing.sourceOfMoneyId.toString();
            const amount = existing.amount;
            const source = await SourcesOfMoneyModel.findOne({ _id: sourceId, userId: user.userId })
                .select("type archivedAt")
                .lean<{ type: SourcesOfMoneyType; archivedAt?: Date | null }>();
            if (!source || source.archivedAt) {
                throw new Error("Nguồn tiền đã bị xóa. Hãy hủy khoản chi dự kiến này");
            }
            const isCard = source.type === SourcesOfMoneyType.CREDIT_CARD;
            const context = {
                userId: user.userId,
                sourceOfMoneyId: sourceId,
                operation: "planned-expense.confirm",
            };

            // 1. Chiếm trạng thái (atomic): sửa/hủy/xác nhận chen giữa không chạy được nữa
            const claimed = await PlannedExpensesModel.findOneAndUpdate(
                { _id: id, userId: user.userId, status: PlannedExpenseStatus.PENDING, amount },
                { $set: { status: PlannedExpenseStatus.CONFIRMED, confirmedAt: now } },
                { returnDocument: "after" },
            );
            if (!claimed) throw new Error(NOT_PENDING);

            // 2. Đổi giữ chỗ thành trừ thật trong một lần ghi
            let converted;
            try {
                converted = await SourcesOfMoneyModel.findOneAndUpdate(
                    isCard
                        ? {
                              _id: sourceId,
                              userId: user.userId,
                              type: SourcesOfMoneyType.CREDIT_CARD,
                              archivedAt: null,
                              reservedAmount: { $gte: amount },
                              $expr: {
                                  $lte: [
                                      { $add: [{ $ifNull: ["$creditDetails.currentDebt", 0] }, amount] },
                                      { $add: [{ $ifNull: ["$creditDetails.creditLimit", 0] }, 0.0001] },
                                  ],
                              },
                          }
                        : {
                              _id: sourceId,
                              userId: user.userId,
                              type: { $ne: SourcesOfMoneyType.CREDIT_CARD },
                              archivedAt: null,
                              reservedAmount: { $gte: amount },
                              balance: { $gte: amount },
                          },
                    {
                        $inc: isCard
                            ? { "creditDetails.currentDebt": amount, reservedAmount: -amount }
                            : { balance: -amount, reservedAmount: -amount },
                    },
                    { returnDocument: "after" },
                );
                if (!converted) {
                    throw new Error(
                        isCard
                            ? "Hạn mức thẻ không còn đủ để xác nhận. Hãy sửa số tiền hoặc hủy"
                            : "Số dư nguồn tiền không còn đủ để xác nhận. Hãy sửa số tiền hoặc hủy",
                    );
                }
            } catch (convertError) {
                await safeRollback(
                    { ...context, step: "restore-pending", amount, originalError: convertError },
                    () =>
                        PlannedExpensesModel.updateOne(
                            { _id: id, userId: user.userId },
                            { $set: { status: PlannedExpenseStatus.PENDING, confirmedAt: null } },
                        ),
                );
                throw convertError;
            }

            // 3. Tạo chi tiêu thật và gắn vào khoản dự kiến
            let expenseId: mongoose.Types.ObjectId | undefined;
            try {
                const expense = await ExpensesModel.create({
                    userId: user.userId,
                    categoryId: existing.categoryId,
                    sourceOfMoneyId: existing.sourceOfMoneyId,
                    amount,
                    note: existing.note ?? "",
                    spentAt,
                });
                expenseId = expense._id as mongoose.Types.ObjectId;
                await PlannedExpensesModel.updateOne(
                    { _id: id, userId: user.userId },
                    { $set: { expenseId } },
                );
            } catch (createError) {
                if (expenseId) {
                    await safeRollback(
                        { ...context, step: "delete-expense", amount, originalError: createError },
                        () => ExpensesModel.findOneAndDelete({ _id: expenseId, userId: user.userId }),
                    );
                }
                await safeRollback(
                    { ...context, step: "revert-conversion", amount, originalError: createError },
                    () =>
                        SourcesOfMoneyModel.updateOne(
                            { _id: sourceId, userId: user.userId },
                            {
                                $inc: isCard
                                    ? { "creditDetails.currentDebt": -amount, reservedAmount: amount }
                                    : { balance: amount, reservedAmount: amount },
                            },
                        ),
                );
                await safeRollback(
                    { ...context, step: "restore-pending", amount, originalError: createError },
                    () =>
                        PlannedExpensesModel.updateOne(
                            { _id: id, userId: user.userId },
                            {
                                $set: {
                                    status: PlannedExpenseStatus.PENDING,
                                    confirmedAt: null,
                                    expenseId: null,
                                },
                            },
                        ),
                );
                throw createError;
            }

            const populated = await getPopulated(id, user.userId);
            return successResponse(populated, "Đã ghi khoản chi dự kiến thành chi tiêu");
        } catch (error) {
            return errorResponseWithStatusCode(
                errorMessage(error, "Xác nhận khoản chi dự kiến thất bại"),
                400,
            );
        }
    }
}
