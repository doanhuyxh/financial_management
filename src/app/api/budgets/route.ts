import type { NextRequest } from "next/server";
import { errorResponseWithStatusCode } from "@/server/utils/responseServer";
import { BudgetsService } from "@/server/services/budgets.service";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const now = new Date();
        const year = parseInt(searchParams.get("year") || String(now.getFullYear()), 10);
        const month = parseInt(searchParams.get("month") || String(now.getMonth() + 1), 10);
        return await BudgetsService.getBudgets({ year, month });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Something went wrong";
        return errorResponseWithStatusCode(message);
    }
}

export async function POST(req: NextRequest) {
    try {
        const { categoryId, amount } = await req.json();
        return await BudgetsService.createBudget({ categoryId, amount });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Something went wrong";
        return errorResponseWithStatusCode(message);
    }
}
