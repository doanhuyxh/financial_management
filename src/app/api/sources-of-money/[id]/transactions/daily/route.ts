import type { NextRequest } from "next/server";
import { errorResponseWithStatusCode } from "@/server/utils/responseServer";
import { SourceTransactionsService } from "@/server/services/source-transactions.service";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { id } = await params;
        const { searchParams } = new URL(req.url);
        return await SourceTransactionsService.getSourceDailyTotals(id, searchParams.get("month"));
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Something went wrong";
        return errorResponseWithStatusCode(message);
    }
}
