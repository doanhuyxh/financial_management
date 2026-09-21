import type { NextRequest } from "next/server";
import { errorResponseWithStatusCode } from "@/server/utils/responseServer";
import { CategoriesService } from "@/server/services/categories.service";


export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get("page") || "1", 10);
        const limit = parseInt(searchParams.get("limit") || "10", 10);
        const search = searchParams.get("search") || "";
        return await CategoriesService.getCategories({ page, limit, search });
    } catch (error: any) {
        return errorResponseWithStatusCode(error.message);

    }
}

export async function POST(req: NextRequest) {
    try {
        const { name } = await req.json();
        if (!name) {
            return errorResponseWithStatusCode("Tên danh mục là bắt buộc", 400);
        }
        return await CategoriesService.createCategory({ name });
    } catch (error: any) {
        return errorResponseWithStatusCode(error.message);
    }
}