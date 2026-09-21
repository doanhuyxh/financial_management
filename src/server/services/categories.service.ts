import dbConnect from "@/server/connectDb";
import CategoriesModel from "@/server/models/categories.model";
import {
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

export class CategoriesService {
    static async getCategories(query: IPaginatedCategoriesQuery) {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) {
            return unauthorizedResponse();
        }

        const { page = 1, limit = 100, search = "" } = query;
        const filter: Record<string, unknown> = { userId: user.userId };
        if (search) {
            filter.name = { $regex: search, $options: "i" };
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

        const [categories, total] = await Promise.all([
            CategoriesModel.find(filter)
                .skip((page - 1) * limit)
                .limit(limit)
                .sort({ sortOrder: 1, createdAt: 1 })
                .select(["_id", "name", "sortOrder", "createdAt", "updatedAt"]),
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

        const last = await CategoriesModel.findOne({ userId: user.userId })
            .sort({ sortOrder: -1 })
            .select("sortOrder")
            .lean();

        const sortOrder = (last?.sortOrder ?? -1) + 1;

        const newCategory = await CategoriesModel.create({
            name: category.name.trim(),
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

        const updatedCategory = await CategoriesModel.findOneAndUpdate(
            { _id: id, userId: user.userId },
            { name: category.name.trim() },
            { new: true },
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

        const owned = await CategoriesModel.find({
            userId: user.userId,
            _id: { $in: orderedIds },
        }).select("_id");

        if (owned.length !== orderedIds.length) {
            return errorResponseWithStatusCode(
                "Một số danh mục không tồn tại hoặc không thuộc về bạn",
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
