import type { NextRequest } from "next/server";
import { errorResponseWithStatusCode } from "@/server/utils/responseServer";
import { TransfersService } from "@/server/services/transfers.service";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get("page") || "1", 10);
        const limit = parseInt(searchParams.get("limit") || "10", 10);
        const search = searchParams.get("search") || "";
        const fromSourceId = searchParams.get("fromSourceId") || undefined;
        const toSourceId = searchParams.get("toSourceId") || undefined;
        const from = searchParams.get("from") || undefined;
        const to = searchParams.get("to") || undefined;

        return await TransfersService.getTransfers({
            page,
            limit,
            search,
            fromSourceId,
            toSourceId,
            from,
            to,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Something went wrong";
        return errorResponseWithStatusCode(message);
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        return await TransfersService.createTransfer(body);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Something went wrong";
        return errorResponseWithStatusCode(message);
    }
}
