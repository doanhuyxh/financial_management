import type { NextRequest } from "next/server";
import { errorResponseWithStatusCode } from "@/server/utils/responseServer";
import { CardRolloversService } from "@/server/services/card-rollovers.service";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        return await CardRolloversService.getCardRollovers({
            page: parseInt(searchParams.get("page") || "1", 10),
            limit: parseInt(searchParams.get("limit") || "10", 10),
            sourceOfMoneyId: searchParams.get("sourceOfMoneyId") || undefined,
            from: searchParams.get("from") || undefined,
            to: searchParams.get("to") || undefined,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Something went wrong";
        return errorResponseWithStatusCode(message);
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        return await CardRolloversService.createCardRollover(body);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Something went wrong";
        return errorResponseWithStatusCode(message);
    }
}
