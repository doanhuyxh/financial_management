import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TransactionAuditKind } from "@/libs/interfaces/transactionAuditsData";
import { ExpensesService } from "@/server/services/expenses.service";
import { IncomesService } from "@/server/services/incomes.service";
import { TransactionAuditsService } from "@/server/services/transaction-audits.service";
import { TransfersService } from "@/server/services/transfers.service";
import { daySchema, limitSchema, objectIdSchema, pageSchema, registerReadTool } from "../registerReadTool";

const LIST_NOTE =
    "Response: items (newest first), pagination, summary { count, totalAmount } over the WHOLE filter (not just this page), dayTotals for days on this page, breakdown (top 8 groups).";

const baseFilters = {
    from: daySchema.optional().describe("From day, YYYY-MM-DD Vietnam time"),
    to: daySchema.optional().describe("To day inclusive, YYYY-MM-DD Vietnam time"),
    search: z.string().max(100).optional().describe("Note contains (case-insensitive)"),
    page: pageSchema,
    limit: limitSchema,
};

/** Chi tiêu, thu nhập, chuyển tiền, lịch sử sửa/xóa. */
export function registerTransactionTools(server: McpServer) {
    registerReadTool(
        server,
        "list_expenses",
        {
            title: "List expenses",
            description: `List expenses with category and source. Includes transfer/rollover fees (skipBalanceAdjust = true). ${LIST_NOTE} breakdown is by category.`,
            inputSchema: {
                ...baseFilters,
                categoryId: objectIdSchema.optional(),
                sourceOfMoneyId: objectIdSchema.optional(),
            },
        },
        (query) => ExpensesService.getExpenses({ ...query, limit: query.limit ?? 20 }),
    );

    registerReadTool(
        server,
        "list_incomes",
        {
            title: "List incomes",
            description: `List incomes with category and source. ${LIST_NOTE} breakdown is by category.`,
            inputSchema: {
                ...baseFilters,
                categoryId: objectIdSchema.optional(),
                sourceOfMoneyId: objectIdSchema.optional(),
            },
        },
        (query) => IncomesService.getIncomes({ ...query, limit: query.limit ?? 20 }),
    );

    registerReadTool(
        server,
        "list_transfers",
        {
            title: "List transfers",
            description: `List transfers between the user's own sources (not income/expense). feeAmount is charged on top and recorded as an expense. ${LIST_NOTE} summary also has totalFee; breakdown is by destination source.`,
            inputSchema: {
                ...baseFilters,
                fromSourceId: objectIdSchema.optional(),
                toSourceId: objectIdSchema.optional(),
            },
        },
        (query) => TransfersService.getTransfers({ ...query, limit: query.limit ?? 20 }),
    );

    registerReadTool(
        server,
        "list_transaction_audits",
        {
            title: "Edit/delete history",
            description:
                "History of edited and deleted transactions (before/after snapshots), newest first. names maps category/source ids in this page to names.",
            inputSchema: {
                kind: z.nativeEnum(TransactionAuditKind).optional(),
                page: pageSchema,
                limit: limitSchema,
            },
        },
        (query) => TransactionAuditsService.getTransactionAudits(query),
    );
}
