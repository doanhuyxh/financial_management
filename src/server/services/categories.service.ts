import dbConnect from "@/server/connectDb";
import CategoriesModel from "@/server/models/categories.model";
import ExpensesModel from "@/server/models/expenses.model";
import IncomesModel from "@/server/models/incomes.model";
import {
    CategoryKind,
    IFromCategoriesData,
    IPaginatedCategoriesQuery,
    IReorderCategoriesData,
} from "@/libs/interfaces/categoriesData";
import {
    errorResponseWithStatusCode,
    successResponse,
    successResponsePageNation,
    unauthorizedResponse,
} from "../utils/responseServer";
import { getCurrentUser } from "../utils/getCurrentUser";
import { escapeRegex } from "../utils/escapeRegex";
import { normalizePagination } from "../utils/pagination";

function isCategoryKind(value: unknown): value is CategoryKind {
    return Object.values(CategoryKind).includes(value as CategoryKind);
}

/** Legacy: danh mục chỉ dùng cho thu nhập → INCOME, còn lại → EXPENSE. */
async function backfillCategoryKind(userId: string) {
    const missing = await CategoriesModel.find({
        userId,
        $or: [{ kind: { $exists: false } }, { kind: null }],
    }).select("_id");
    if (missing.length === 0) return;

    const ids = missing.map((doc) => doc._id);
    const [expenseCategoryIds, incomeCategoryIds] = await Promise.all([
        ExpensesModel.distinct("categoryId", { userId, categoryId: { $in: ids } }),
        IncomesModel.distinct("categoryId", { userId, categoryId: { $in: ids } }),
    ]);
    const usedByExpense = new Set(expenseCategoryIds.map(String));
    const incomeOnly = incomeCategoryIds
        .map(String)
        .filter((id) => !usedByExpense.has(id));

    if (incomeOnly.length > 0) {
        await CategoriesModel.updateMany(
            { userId, _id: { $in: incomeOnly } },
            { $set: { kind: CategoryKind.INCOME } },
        );
    }
    await CategoriesModel.updateMany(
        { userId, _id: { $in: ids }, $or: [{ kind: { $exists: false } }, { kind: null }] },
        { $set: { kind: CategoryKind.EXPENSE } },
    );
}

export class CategoriesService {
    static async getCategories(query: IPaginatedCategoriesQuery) {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) {
            return unauthorizedResponse();
        }

        const { search = "" } = query;
        const { page, limit } = normalizePagination(query.page, query.limit, 100);
        const filter: Record<string, unknown> = { userId: user.userId };
        if (search) {
            filter.name = { $regex: escapeRegex(search), $options: "i" };
        }

        // Backfill sortOrder for legacy documents
        const missingSortOrder = await CategoriesModel.countDocuments({
            userId: user.userId,
            $or: [{ sortOrder: { $exists: false } }, { sortOrder: null }],
        });
        if (missingSortOrder > 0) {
            const all = await CategoriesModel.find({ userId: user.userId })
                .sort({ createdAt: 1 })
                .select("_id");
            await Promise.all(
                all.map((doc, index) =>
                    CategoriesModel.updateOne(
                        { _id: doc._id },
                        { $set: { sortOrder: index } },
                    ),
                ),
            );
        }

        await backfillCategoryKind(user.userId);

        const [categories, total] = await Promise.all([
            CategoriesModel.find(filter)
                .skip((page - 1) * limit)
                .limit(limit)
                .sort({ sortOrder: 1, createdAt: 1 })
                .select(["_id", "name", "kind", "sortOrder", "createdAt", "updatedAt"]),
            CategoriesModel.countDocuments(filter),
        ]);

        return successResponsePageNation(categories, total, page, limit);
    }

    static async createCategory(category: IFromCategoriesData) {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) {
            return unauthorizedResponse();
        }

        if (!isCategoryKind(category.kind)) {
            return errorResponseWithStatusCode("Loại danh mục không hợp lệ", 400);
        }

        const last = await CategoriesModel.findOne({ userId: user.userId })
            .sort({ sortOrder: -1 })
            .select("sortOrder")
            .lean();

        const sortOrder = (last?.sortOrder ?? -1) + 1;

        const newCategory = await CategoriesModel.create({
            name: category.name.trim(),
            kind: category.kind,
            sortOrder,
            userId: user.userId,
        });
        return successResponse(newCategory, "Tạo danh mục thành công");
    }

    static async updateCategory(id: string, category: IFromCategoriesData) {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) {
            return unauthorizedResponse();
        }

        if (category.kind !== undefined && !isCategoryKind(category.kind)) {
            return errorResponseWithStatusCode("Loại danh mục không hợp lệ", 400);
        }

        const existing = await CategoriesModel.findOne({ _id: id, userId: user.userId })
            .select("kind")
            .lean<{ kind?: CategoryKind }>();
        if (!existing) {
            return errorResponseWithStatusCode("Không tìm thấy danh mục", 404);
        }

        const update: Record<string, unknown> = { name: category.name.trim() };
        if (category.kind && category.kind !== existing.kind) {
            // Đổi loại sẽ làm giao dịch cũ nằm sai loại danh mục
            const [expenseCount, incomeCount] = await Promise.all([
                ExpensesModel.countDocuments({ userId: user.userId, categoryId: id }),
                IncomesModel.countDocuments({ userId: user.userId, categoryId: id }),
            ]);
            if (expenseCount + incomeCount > 0) {
                return errorResponseWithStatusCode(
                    "Danh mục đã có giao dịch, không thể đổi loại",
                    400,
                );
            }
            update.kind = category.kind;
        }

        const updatedCategory = await CategoriesModel.findOneAndUpdate(
            { _id: id, userId: user.userId },
            update,
            { returnDocument: "after" },
        );

        if (!updatedCategory) {
            return errorResponseWithStatusCode("Không tìm thấy danh mục", 404);
        }

        return successResponse(updatedCategory, "Cập nhật danh mục thành công");
    }

    static async reorderCategories(data: IReorderCategoriesData) {
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
            CategoriesModel.find({
                userId: user.userId,
                _id: { $in: orderedIds },
            }).select("_id"),
            CategoriesModel.countDocuments({ userId: user.userId }),
        ]);

        if (owned.length !== orderedIds.length) {
            return errorResponseWithStatusCode(
                "Một số danh mục không tồn tại hoặc không thuộc về bạn",
                400,
            );
        }
        if (orderedIds.length !== totalOwned) {
            return errorResponseWithStatusCode(
                "Cần gửi đầy đủ danh sách danh mục để sắp xếp",
                400,
            );
        }

        await Promise.all(
            orderedIds.map((id, index) =>
                CategoriesModel.updateOne(
                    { _id: id, userId: user.userId },
                    { $set: { sortOrder: index } },
                ),
            ),
        );

        return successResponse(null, "Cập nhật thứ tự danh mục thành công");
    }

    static async deleteCategory(id: string) {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) {
            return unauthorizedResponse();
        }

        const deleted = await CategoriesModel.findOneAndDelete({
            _id: id,
            userId: user.userId,
        });

        if (!deleted) {
            return errorResponseWithStatusCode("Không tìm thấy danh mục", 404);
        }

        return successResponse(null, "Xóa danh mục thành công");
    }
}
