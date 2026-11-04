import type { NextRequest } from "next/server";
import { errorResponseWithStatusCode } from "@/server/utils/responseServer";
import { RolloverJourneysService } from "@/server/services/rollover-journeys.service";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        return await RolloverJourneysService.getJourneys(searchParams.get("cardId") || undefined);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Something went wrong";
        return errorResponseWithStatusCode(message);
    }
}
