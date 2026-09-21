import type { NextRequest } from "next/server";
import { errorResponseWithStatusCode } from "@/server/utils/responseServer";
import { ExpensesService } from "@/server/services/expenses.service";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get("page") || "1", 10);
        const limit = parseInt(searchParams.get("limit") || "10", 10);
        const search = searchParams.get("search") || "";
        const categoryId = searchParams.get("categoryId") || undefined;
        const sourceOfMoneyId = searchParams.get("sourceOfMoneyId") || undefined;
        const from = searchParams.get("from") || undefined;
        const to = searchParams.get("to") || undefined;

        return await ExpensesService.getExpenses({
            page,
            limit,
            search,
            categoryId,
            sourceOfMoneyId,
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
        return await ExpensesService.createExpense(body);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Something went wrong";
        return errorResponseWithStatusCode(message);
    }
}
