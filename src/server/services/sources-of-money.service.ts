import dbConnect from "@/server/connectDb";
import SourcesOfMoneyModel from "@/server/models/sources-of-money.model";
import {
    IFromSourcesOfMoneyData,
    IPaginatedSourcesOfMoneyQuery,
    SourcesOfMoneyType,
} from "@/libs/interfaces/sourcesOfMoneyData";
import {
    errorResponseWithStatusCode,
    successResponse,
    successResponsePageNation,
    unauthorizedResponse,
} from "../utils/responseServer";
import { getCurrentUser } from "../utils/getCurrentUser";

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

export class SourcesOfMoneyService {
    static async getSourcesOfMoney(query: IPaginatedSourcesOfMoneyQuery) {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) {
            return unauthorizedResponse();
        }

        const { page = 1, limit = 10, search = "", type } = query;
        const filter: Record<string, unknown> = { userId: user.userId };

        if (search) {
            filter.name = { $regex: search, $options: "i" };
        }
        if (type) {
            filter.type = type;
        }

        const [docs, total] = await Promise.all([
            SourcesOfMoneyModel.find(filter)
                .skip((page - 1) * limit)
                .limit(limit)
                .sort({ createdAt: -1 }),
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
            const created = await SourcesOfMoneyModel.create({
                ...payload,
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
                { new: true },
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
