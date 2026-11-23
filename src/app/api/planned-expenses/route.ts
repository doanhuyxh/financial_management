import type { NextRequest } from "next/server";
import { errorResponseWithStatusCode } from "@/server/utils/responseServer";
import { withIdempotency } from "@/server/utils/idempotency";
import { PlannedExpensesService } from "@/server/services/planned-expenses.service";
import type { PlannedExpenseStatus } from "@/libs/interfaces/plannedExpensesData";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const status = (searchParams.get("status") || undefined) as PlannedExpenseStatus | undefined;
        return await PlannedExpensesService.getPlannedExpenses({ status });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Something went wrong";
        return errorResponseWithStatusCode(message);
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        return await withIdempotency(req, "planned-expense.create", body, () =>
            PlannedExpensesService.createPlannedExpense(body),
        );
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Something went wrong";
        return errorResponseWithStatusCode(message);
    }
}
