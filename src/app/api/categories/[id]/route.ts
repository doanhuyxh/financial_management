import type { NextRequest } from "next/server";
import { errorResponseWithStatusCode } from "@/server/utils/responseServer";
import { CategoriesService } from "@/server/services/categories.service";



export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const { name } = await req.json();
        if (!name) {
            return errorResponseWithStatusCode("Tên danh mục là bắt buộc", 400);
        }
        return await CategoriesService.updateCategory(id, { name });
    } catch (error: any) {
        return errorResponseWithStatusCode(error.message);
    }
}


export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        return await CategoriesService.deleteCategory(id);
    } catch (error: any) {
        return errorResponseWithStatusCode(error.message);
    }
}