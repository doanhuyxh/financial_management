import mongoose from "mongoose";
import dbConnect from "@/server/connectDb";
import IncomesModel from "@/server/models/incomes.model";
import CategoriesModel from "@/server/models/categories.model";
import SourcesOfMoneyModel from "@/server/models/sources-of-money.model";
import {
    type IFromIncomesData,
    type IPaginatedIncomesQuery,
} from "@/libs/interfaces/incomesData";
import { SourcesOfMoneyType } from "@/libs/interfaces/sourcesOfMoneyData";
import {
    errorResponseWithStatusCode,
    successResponse,
    successResponsePageNation,
    unauthorizedResponse,
} from "../utils/responseServer";
import { getCurrentUser } from "../utils/getCurrentUser";
import { escapeRegex } from "../utils/escapeRegex";

function normalizePayload(data: IFromIncomesData) {
    const categoryId = data.categoryId?.trim();
    const sourceOfMoneyId = data.sourceOfMoneyId?.trim();
    const amount = Number(data.amount);
    const note = data.note?.trim() || "";
    const receivedAt = data.receivedAt ? new Date(data.receivedAt) : new Date();

    if (!categoryId) throw new Error("Danh mục là bắt buộc");
    if (!sourceOfMoneyId) throw new Error("Nguồn tiền là bắt buộc");
    if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Số tiền phải lớn hơn 0");
    }
    if (Number.isNaN(receivedAt.getTime())) {
        throw new Error("Ngày thu không hợp lệ");
    }

    return { categoryId, sourceOfMoneyId, amount, note, receivedAt };
}

async function assertOwnedRefs(
    userId: string,
    categoryId: string,
    sourceOfMoneyId: string,
) {
    const [category, source] = await Promise.all([
        CategoriesModel.findOne({ _id: categoryId, userId }).select("_id name"),
        SourcesOfMoneyModel.findOne({ _id: sourceOfMoneyId, userId }),
    ]);

    if (!category) throw new Error("Không tìm thấy danh mục");
    if (!source) throw new Error("Không tìm thấy nguồn tiền");

    return { category, source };
}

/**
 * Apply income: tăng số dư / giảm dư nợ thẻ.
 * Revert income: giảm số dư / tăng lại dư nợ thẻ.
 */
async function adjustSourceBalance(
    userId: string,
    sourceId: string,
    amount: number,
    direction: "apply" | "revert",
) {
    const source = await SourcesOfMoneyModel.findOne({ _id: sourceId, userId });
    if (!source) {
        throw new Error("Không tìm thấy nguồn tiền");
    }

    if (source.type === SourcesOfMoneyType.CREDIT_CARD) {
        const debt = source.creditDetails?.currentDebt ?? 0;
        // apply: thanh toán dư nợ (−amount); revert: hoàn lại dư nợ (+amount)
        const debtDelta = direction === "apply" ? -amount : amount;
        const nextDebt = debt + debtDelta;

        if (direction === "apply" && amount > debt + 0.0001) {
            throw new Error("Số tiền thanh toán vượt dư nợ hiện tại");
        }
        if (nextDebt < -0.0001) {
            throw new Error("Không thể thanh toán dư nợ dưới 0");
        }

        const filter: Record<string, unknown> = {
            _id: sourceId,
            userId,
            type: SourcesOfMoneyType.CREDIT_CARD,
        };
        if (direction === "apply") {
            filter["creditDetails.currentDebt"] = { $gte: amount };
        }

        const updated = await SourcesOfMoneyModel.findOneAndUpdate(
            filter,
            { $inc: { "creditDetails.currentDebt": debtDelta } },
            { returnDocument: "after" },
        );
        if (!updated) {
            throw new Error(
                direction === "apply"
                    ? "Số tiền thanh toán vượt dư nợ hiện tại"
                    : "Hoàn dư nợ thẻ tín dụng thất bại",
            );
        }
        return updated;
    }

    // CASH / BANK / E_WALLET / OTHER: apply tăng số dư, revert giảm số dư
    const balanceDelta = direction === "apply" ? amount : -amount;
    const filter: Record<string, unknown> = {
        _id: sourceId,
        userId,
        type: { $ne: SourcesOfMoneyType.CREDIT_CARD },
    };
    if (direction === "revert") {
        filter.balance = { $gte: amount };
    }

    const updated = await SourcesOfMoneyModel.findOneAndUpdate(
        filter,
        { $inc: { balance: balanceDelta } },
        { returnDocument: "after" },
    );

    if (!updated) {
        throw new Error(
            direction === "apply"
                ? "Cập nhật số dư nguồn tiền thất bại"
                : "Hoàn số dư nguồn tiền thất bại",
        );
    }
    return updated;
}

async function getPopulatedIncome(id: string, userId: string) {
    return IncomesModel.findOne({ _id: id, userId })
        .populate("categoryId", "name")
        .populate("sourceOfMoneyId", "name type balance creditDetails")
        .lean();
}

export class IncomesService {
    static async getIncomes(query: IPaginatedIncomesQuery) {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) return unauthorizedResponse();

        const {
            page = 1,
            limit = 10,
            search = "",
            categoryId,
            sourceOfMoneyId,
            from,
            to,
        } = query;

        const filter: Record<string, unknown> = { userId: user.userId };

        if (search) {
            filter.note = { $regex: escapeRegex(search), $options: "i" };
        }
        if (categoryId) filter.categoryId = categoryId;
        if (sourceOfMoneyId) filter.sourceOfMoneyId = sourceOfMoneyId;

        if (from || to) {
            const receivedAt: Record<string, Date> = {};
            if (from) receivedAt.$gte = new Date(from);
            if (to) {
                const end = new Date(to);
                end.setHours(23, 59, 59, 999);
                receivedAt.$lte = end;
            }
            filter.receivedAt = receivedAt;
        }

        const [items, total] = await Promise.all([
            IncomesModel.find(filter)
                .populate("categoryId", "name")
                .populate("sourceOfMoneyId", "name type balance creditDetails")
                .skip((page - 1) * limit)
                .limit(limit)
                .sort({ receivedAt: -1, createdAt: -1 })
                .lean(),
            IncomesModel.countDocuments(filter),
        ]);

        return successResponsePageNation(items, total, page, limit);
    }

    static async createIncome(data: IFromIncomesData) {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) return unauthorizedResponse();

        try {
            const payload = normalizePayload(data);
            await assertOwnedRefs(
                user.userId,
                payload.categoryId,
                payload.sourceOfMoneyId,
            );

            await adjustSourceBalance(
                user.userId,
                payload.sourceOfMoneyId,
                payload.amount,
                "apply",
            );

            try {
                const created = await IncomesModel.create({
                    ...payload,
                    userId: user.userId,
                    categoryId: new mongoose.Types.ObjectId(payload.categoryId),
                    sourceOfMoneyId: new mongoose.Types.ObjectId(
                        payload.sourceOfMoneyId,
                    ),
                });

                const populated = await getPopulatedIncome(
                    created._id.toString(),
                    user.userId,
                );
                return successResponse(populated, "Tạo thu nhập thành công");
            } catch (createError) {
                await adjustSourceBalance(
                    user.userId,
                    payload.sourceOfMoneyId,
                    payload.amount,
                    "revert",
                );
                throw createError;
            }
        } catch (error: unknown) {
            const message =
                error instanceof Error ? error.message : "Tạo thu nhập thất bại";
            return errorResponseWithStatusCode(message, 400);
        }
    }

    static async updateIncome(id: string, data: IFromIncomesData) {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) return unauthorizedResponse();

        try {
            const existing = await IncomesModel.findOne({
                _id: id,
                userId: user.userId,
            });
            if (!existing) {
                return errorResponseWithStatusCode("Không tìm thấy thu nhập", 404);
            }

            const payload = normalizePayload(data);
            await assertOwnedRefs(
                user.userId,
                payload.categoryId,
                payload.sourceOfMoneyId,
            );

            const oldSourceId = existing.sourceOfMoneyId.toString();
            const oldAmount = existing.amount;

            await adjustSourceBalance(user.userId, oldSourceId, oldAmount, "revert");

            try {
                await adjustSourceBalance(
                    user.userId,
                    payload.sourceOfMoneyId,
                    payload.amount,
                    "apply",
                );
            } catch (applyError) {
                await adjustSourceBalance(
                    user.userId,
                    oldSourceId,
                    oldAmount,
                    "apply",
                );
                throw applyError;
            }

            try {
                const updated = await IncomesModel.findOneAndUpdate(
                    { _id: id, userId: user.userId },
                    {
                        categoryId: new mongoose.Types.ObjectId(payload.categoryId),
                        sourceOfMoneyId: new mongoose.Types.ObjectId(
                            payload.sourceOfMoneyId,
                        ),
                        amount: payload.amount,
                        note: payload.note,
                        receivedAt: payload.receivedAt,
                    },
                    { returnDocument: "after" },
                );

                if (!updated) {
                    throw new Error("Cập nhật thu nhập thất bại");
                }

                const populated = await getPopulatedIncome(id, user.userId);
                return successResponse(populated, "Cập nhật thu nhập thành công");
            } catch (updateError) {
                await adjustSourceBalance(
                    user.userId,
                    payload.sourceOfMoneyId,
                    payload.amount,
                    "revert",
                );
                await adjustSourceBalance(
                    user.userId,
                    oldSourceId,
                    oldAmount,
                    "apply",
                );
                throw updateError;
            }
        } catch (error: unknown) {
            const message =
                error instanceof Error ? error.message : "Cập nhật thu nhập thất bại";
            return errorResponseWithStatusCode(message, 400);
        }
    }

    static async deleteIncome(id: string) {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) return unauthorizedResponse();

        try {
            const existing = await IncomesModel.findOne({
                _id: id,
                userId: user.userId,
            });
            if (!existing) {
                return errorResponseWithStatusCode("Không tìm thấy thu nhập", 404);
            }

            await adjustSourceBalance(
                user.userId,
                existing.sourceOfMoneyId.toString(),
                existing.amount,
                "revert",
            );

            try {
                await IncomesModel.findOneAndDelete({
                    _id: id,
                    userId: user.userId,
                });
            } catch (deleteError) {
                await adjustSourceBalance(
                    user.userId,
                    existing.sourceOfMoneyId.toString(),
                    existing.amount,
                    "apply",
                );
                throw deleteError;
            }

            return successResponse(null, "Xóa thu nhập thành công");
        } catch (error: unknown) {
            const message =
                error instanceof Error ? error.message : "Xóa thu nhập thất bại";
            return errorResponseWithStatusCode(message, 400);
        }
    }
}
