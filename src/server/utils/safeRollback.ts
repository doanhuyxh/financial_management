import type { Types } from "mongoose";
import IntegrityIssuesModel from "@/server/models/integrity-issues.model";

export interface IRollbackContext {
    userId: string | Types.ObjectId;
    sourceOfMoneyId?: string | Types.ObjectId | null;
    /** VD: "expense.update" */
    operation: string;
    /** VD: "revert-new-source" */
    step: string;
    amount?: number;
    /** Lỗi làm phải bù trừ; được ghi kèm để biết vì sao */
    originalError?: unknown;
}

function errorText(error: unknown) {
    if (error instanceof Error) return error.message;
    return typeof error === "string" ? error : JSON.stringify(error ?? null);
}

/**
 * Chạy một bước bù trừ thủ công. Nếu chính bước này lỗi: log `console.error` (giữ ở production)
 * và ghi IntegrityIssue, rồi **nuốt lỗi** để caller ném tiếp lỗi gốc và chạy các bước bù trừ sau.
 * Trả về true khi bù trừ thành công.
 */
export async function safeRollback(
    context: IRollbackContext,
    rollback: () => Promise<unknown>,
): Promise<boolean> {
    try {
        await rollback();
        return true;
    } catch (rollbackError) {
        const record = {
            userId: context.userId,
            sourceOfMoneyId: context.sourceOfMoneyId ?? undefined,
            operation: context.operation,
            step: context.step,
            amount: context.amount,
            originalError: errorText(context.originalError),
            rollbackError: errorText(rollbackError),
        };
        console.error("[integrity] Bù trừ thất bại, số dư có thể lệch sổ cái", record);
        try {
            await IntegrityIssuesModel.create(record);
        } catch (logError) {
            console.error("[integrity] Không ghi được IntegrityIssue", logError);
        }
        return false;
    }
}
