import type { NextRequest } from "next/server";
import { errorResponseWithStatusCode } from "@/server/utils/responseServer";
import { TransactionAuditsService } from "@/server/services/transaction-audits.service";
import type { TransactionAuditKind } from "@/libs/interfaces/transactionAuditsData";

export async function GET(req: NextRequest) {
    try {
        const params = req.nextUrl.searchParams;
        return await TransactionAuditsService.getTransactionAudits({
            page: Number(params.get("page")) || undefined,
            limit: Number(params.get("limit")) || undefined,
            kind: (params.get("kind") as TransactionAuditKind | null) || undefined,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Something went wrong";
        return errorResponseWithStatusCode(message);
    }
}
