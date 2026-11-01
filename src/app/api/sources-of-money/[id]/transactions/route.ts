import type { NextRequest } from "next/server";
import { errorResponseWithStatusCode } from "@/server/utils/responseServer";
import { SourceTransactionsService } from "@/server/services/source-transactions.service";
import type { SourceTransactionFilter } from "@/libs/interfaces/sourceTransactionsData";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { id } = await params;
        const { searchParams } = new URL(req.url);
        return await SourceTransactionsService.getSourceTransactions(id, {
            page: parseInt(searchParams.get("page") || "1", 10),
            limit: parseInt(searchParams.get("limit") || "20", 10),
            kind: (searchParams.get("kind") || undefined) as SourceTransactionFilter | undefined,
            from: searchParams.get("from") || undefined,
            to: searchParams.get("to") || undefined,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Something went wrong";
        return errorResponseWithStatusCode(message);
    }
}
