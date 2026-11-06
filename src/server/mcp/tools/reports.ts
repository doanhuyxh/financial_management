import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CardRolloversService } from "@/server/services/card-rollovers.service";
import { DashboardService } from "@/server/services/dashboard.service";
import { RolloverJourneysService } from "@/server/services/rollover-journeys.service";
import { SettingsService } from "@/server/services/settings.service";
import { SourcesOfMoneyService } from "@/server/services/sources-of-money.service";
import { formatVietnamDay } from "@/server/utils/dayRange";
import { daySchema, limitSchema, objectIdSchema, pageSchema, registerReadTool } from "../registerReadTool";

const monthInput = {
    year: z.number().int().min(1970).max(9999).optional().describe("Defaults to current year (Vietnam time)"),
    month: z.number().int().min(1).max(12).optional().describe("1-12, defaults to current month"),
};

/** Tháng mặc định theo giờ VN (giống route dashboard, nhưng không phụ thuộc TZ của process). */
function resolveMonth(year?: number, month?: number) {
    const [currentYear, currentMonth] = formatVietnamDay(new Date()).split("-").map(Number);
    return { year: year ?? currentYear, month: month ?? currentMonth };
}

/** Dashboard, thẻ tín dụng, đáo hạn, cài đặt. */
export function registerReportTools(server: McpServer) {
    registerReadTool(
        server,
        "get_cashflow_summary",
        {
            title: "Monthly cash flow",
            description:
                "Income vs expense of a month (Vietnam time): totalIncome, totalExpense, net, savingsRate (null when no income), 6-month trend, previous month, samePeriodPrevious (only for current month), incomeByCategory.",
            inputSchema: monthInput,
        },
        ({ year, month }) => DashboardService.getCashflowSummary(resolveMonth(year, month)),
    );

    registerReadTool(
        server,
        "get_expenses_summary",
        {
            title: "Monthly spending breakdown",
            description:
                "Spending of a month: totalAmount, byCategory, bySource, byDay (every day of month), period info. Includes transfer and rollover fees.",
            inputSchema: monthInput,
        },
        ({ year, month }) => DashboardService.getExpensesSummary(resolveMonth(year, month)),
    );

    registerReadTool(
        server,
        "get_credit_card_fee_progress",
        {
            title: "Credit card fee progress",
            description:
                "Per credit card: statement period, spending toward annual-fee waiver, upcoming fees and interest settings.",
            inputSchema: {},
        },
        () => SourcesOfMoneyService.getCreditCardFeeProgress(),
    );

    registerReadTool(
        server,
        "list_card_rollovers",
        {
            title: "List card rollovers",
            description:
                "Credit card rollover (đáo hạn) records: rolloverAmount, feeAmount, provider. Only the fee increases card debt.",
            inputSchema: {
                sourceOfMoneyId: objectIdSchema.optional().describe("Credit card id"),
                from: daySchema.optional(),
                to: daySchema.optional(),
                page: pageSchema,
                limit: limitSchema,
            },
        },
        (query) => CardRolloversService.getCardRollovers({ ...query, limit: query.limit ?? 20 }),
    );

    registerReadTool(
        server,
        "list_rollover_journeys",
        {
            title: "List rollover journeys",
            description: "Rollover journeys of credit cards with stats; open journeys first.",
            inputSchema: { cardId: objectIdSchema.optional().describe("Credit card id") },
        },
        ({ cardId }) => RolloverJourneysService.getJourneys(cardId),
    );

    registerReadTool(
        server,
        "get_rollover_journey",
        {
            title: "Rollover journey detail",
            description: "One rollover journey: its rollovers (ascending) and self-payments in the period.",
            inputSchema: { id: objectIdSchema.describe("Journey id") },
        },
        ({ id }) => RolloverJourneysService.getJourneyDetail(id),
    );

    registerReadTool(
        server,
        "get_settings",
        {
            title: "User settings",
            description:
                "ledgerLockedBefore: transactions dated before this moment are locked (cannot be created/edited/deleted). null = no lock.",
            inputSchema: {},
        },
        () => SettingsService.getSettings(),
    );
}
