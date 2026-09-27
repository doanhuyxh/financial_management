import type { NextRequest } from "next/server";
import { errorResponseWithStatusCode } from "@/server/utils/responseServer";
import { SourcesOfMoneyService } from "@/server/services/sources-of-money.service";

export async function PUT(req: NextRequest) {
    try {
        const body = await req.json();
        return await SourcesOfMoneyService.reorderSourcesOfMoney(body);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Something went wrong";
        return errorResponseWithStatusCode(message);
    }
}
