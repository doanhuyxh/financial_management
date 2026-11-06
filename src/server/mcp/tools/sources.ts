import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CategoryKind } from "@/libs/interfaces/categoriesData";
import { SourceTransactionFilter } from "@/libs/interfaces/sourceTransactionsData";
import { SourcesOfMoneyType } from "@/libs/interfaces/sourcesOfMoneyData";
import { BalanceReconcileService } from "@/server/services/balance-reconcile.service";
import { CategoriesService } from "@/server/services/categories.service";
import { SourceTransactionsService } from "@/server/services/source-transactions.service";
import { SourcesOfMoneyService } from "@/server/services/sources-of-money.service";
import { daySchema, limitSchema, objectIdSchema, pageSchema, registerReadTool } from "../registerReadTool";

/** Nguồn tiền, danh mục, lịch sử giao dịch của một nguồn và đối soát. */
export function registerSourceTools(server: McpServer) {
    registerReadTool(
        server,
        "list_sources_of_money",
        {
            title: "List sources of money",
            description:
                "List active (not archived) sources of money with current balance. Credit cards: balance is 0, see creditDetails.currentDebt and creditDetails.creditLimit.",
            inputSchema: {
                type: z.nativeEnum(SourcesOfMoneyType).optional().describe("Filter by type"),
                search: z.string().max(100).optional().describe("Name contains (case-insensitive)"),
            },
        },
        ({ type, search }) =>
            SourcesOfMoneyService.getSourcesOfMoney({ type, search, page: 1, limit: 100 }),
    );

    registerReadTool(
        server,
        "get_source_transactions",
        {
            title: "Source transaction history",
            description:
                "Ledger lines of one source of money (expenses, incomes, transfers in/out, manual adjustments, card rollovers), newest first. Works for archived sources. summary.increase/decrease are totals of positive/negative delta in the filter. For credit cards positive delta = debt increases.",
            inputSchema: {
                sourceId: objectIdSchema.describe("Source of money id"),
                kind: z.nativeEnum(SourceTransactionFilter).optional().describe("TRANSFER covers both directions"),
                from: daySchema.optional(),
                to: daySchema.optional(),
                page: pageSchema,
                limit: limitSchema,
            },
        },
        ({ sourceId, ...query }) => SourceTransactionsService.getSourceTransactions(sourceId, query),
    );

    registerReadTool(
        server,
        "get_reconcile",
        {
            title: "Reconcile a source balance",
            description:
                "Compare the stored balance/debt of a source with the sum of its ledger. Read-only: reports the difference, never fixes it.",
            inputSchema: { sourceId: objectIdSchema.describe("Source of money id") },
        },
        ({ sourceId }) => BalanceReconcileService.getReconcile(sourceId),
    );

    registerReadTool(
        server,
        "list_categories",
        {
            title: "List categories",
            description: "List active expense/income categories (id, name, icon, kind).",
            inputSchema: {
                kind: z.nativeEnum(CategoryKind).optional(),
                search: z.string().max(100).optional(),
            },
        },
        ({ kind, search }) => CategoriesService.getCategories({ kind, search, page: 1, limit: 100 }),
    );
}
