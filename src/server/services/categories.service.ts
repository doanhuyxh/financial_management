import dbConnect from "@/server/connectDb";
import CategoriesModel from "@/server/models/categories.model";
import { IFromCategoriesData, IPaginatedCategoriesQuery } from "@/libs/interfaces/categoriesData";
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

        const { page = 1, limit = 10, search = "" } = query;
        const filter: Record<string, unknown> = { userId: user.userId };
        if (search) {
            filter.name = { $regex: search, $options: "i" };
        }

        const [categories, total] = await Promise.all([
            CategoriesModel.find(filter)
                .skip((page - 1) * limit)
                .limit(limit)
                .sort({ createdAt: -1 })
                .select(["_id", "name", "createdAt", "updatedAt"]),
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

        const newCategory = await CategoriesModel.create({
            ...category,
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
            category,
            { new: true },
        );

        if (!updatedCategory) {
            return errorResponseWithStatusCode("Không tìm thấy danh mục", 404);
        }

        return successResponse(updatedCategory, "Cập nhật danh mục thành công");
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
