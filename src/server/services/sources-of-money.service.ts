import dbConnect from "@/server/connectDb";
import SourcesOfMoneyModel from "@/server/models/sources-of-money.model";
import ExpensesModel from "@/server/models/expenses.model";
import IncomesModel from "@/server/models/incomes.model";
import TransfersModel from "@/server/models/transfers.model";
import {
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

        return {
            name,
            type,
            balance: 0,
            creditDetails: {
                creditLimit,
                currentDebt,
                ...(statementDate != null ? { statementDate } : {}),
                ...(dueDate != null ? { dueDate } : {}),
            },
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
        metadata: data.metadata ?? {},
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

export class SourcesOfMoneyService {
    static async getSourcesOfMoney(query: IPaginatedSourcesOfMoneyQuery) {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) {
            return unauthorizedResponse();
        }

        const { search = "", type } = query;
        const { page, limit } = normalizePagination(query.page, query.limit, 100);
        const filter: Record<string, unknown> = { userId: user.userId };

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

            const existing = await SourcesOfMoneyModel.findOne({ _id: id, userId: user.userId })
                .select("type")
                .lean<{ type: SourcesOfMoneyType }>();
            if (!existing) {
                return errorResponseWithStatusCode("Không tìm thấy nguồn tiền", 404);
            }

            // Balance reversal logic depends on CC vs non-CC, so history must not cross that line.
            const wasCreditCard = existing.type === SourcesOfMoneyType.CREDIT_CARD;
            const isCreditCard = payload.type === SourcesOfMoneyType.CREDIT_CARD;
            if (wasCreditCard !== isCreditCard && (await hasTransactions(user.userId, id))) {
                return errorResponseWithStatusCode(
                    "Không thể đổi giữa thẻ tín dụng và loại khác khi nguồn tiền đã có giao dịch",
                    400,
                );
            }

            const updateQuery =
                payload.type === SourcesOfMoneyType.CREDIT_CARD
                    ? { $set: payload }
                    : {
                          $set: {
                              name: payload.name,
                              type: payload.type,
                              balance: payload.balance,
                              metadata: payload.metadata,
                          },
                          $unset: { creditDetails: 1 },
                      };

            const updated = await SourcesOfMoneyModel.findOneAndUpdate(
                { _id: id, userId: user.userId },
                updateQuery,
                { returnDocument: "after" },
            );

            if (!updated) {
                return errorResponseWithStatusCode("Không tìm thấy nguồn tiền", 404);
            }

            return successResponse(updated.toJSON(), "Cập nhật nguồn tiền thành công");
        } catch (error: unknown) {
            const message =
                error instanceof Error ? error.message : "Cập nhật nguồn tiền thất bại";
            return errorResponseWithStatusCode(message, 400);
        }
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
            }).select("_id"),
            SourcesOfMoneyModel.countDocuments({ userId: user.userId }),
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

    static async deleteSourcesOfMoney(id: string) {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) {
            return unauthorizedResponse();
        }

        const deleted = await SourcesOfMoneyModel.findOneAndDelete({
            _id: id,
            userId: user.userId,
        });

        if (!deleted) {
            return errorResponseWithStatusCode("Không tìm thấy nguồn tiền", 404);
        }

        return successResponse(null, "Xóa nguồn tiền thành công");
    }
}
