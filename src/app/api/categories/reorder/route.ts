import type { NextRequest } from "next/server";
import { errorResponseWithStatusCode } from "@/server/utils/responseServer";
import { CategoriesService } from "@/server/services/categories.service";

export async function PUT(req: NextRequest) {
    try {
        const body = await req.json();
        return await CategoriesService.reorderCategories(body);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Something went wrong";
        return errorResponseWithStatusCode(message);
    }
}
