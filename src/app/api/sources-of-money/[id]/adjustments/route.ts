import type { NextRequest } from "next/server";
import { errorResponseWithStatusCode } from "@/server/utils/responseServer";
import { SourcesOfMoneyService } from "@/server/services/sources-of-money.service";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { id } = await params;
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get("page") || "1", 10);
        const limit = parseInt(searchParams.get("limit") || "10", 10);
        return await SourcesOfMoneyService.getBalanceAdjustments(id, { page, limit });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Something went wrong";
        return errorResponseWithStatusCode(message);
    }
}
