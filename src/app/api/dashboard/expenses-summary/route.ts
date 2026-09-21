import type { NextRequest } from "next/server";
import { errorResponseWithStatusCode } from "@/server/utils/responseServer";
import { DashboardService } from "@/server/services/dashboard.service";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const now = new Date();
        const year = parseInt(
            searchParams.get("year") || String(now.getFullYear()),
            10,
        );
        const month = parseInt(
            searchParams.get("month") || String(now.getMonth() + 1),
            10,
        );

        return await DashboardService.getExpensesSummary({ year, month });
    } catch (error: unknown) {
        const message =
            error instanceof Error ? error.message : "Something went wrong";
        return errorResponseWithStatusCode(message);
    }
}
