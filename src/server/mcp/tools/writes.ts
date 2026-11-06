import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CardFeeType } from "@/libs/interfaces/expensesData";
import { ForeignFeeType } from "@/libs/interfaces/sourcesOfMoneyData";
import { ExpensesService } from "@/server/services/expenses.service";
import { IncomesService } from "@/server/services/incomes.service";
import { TransfersService } from "@/server/services/transfers.service";
import { vietnamDayKey } from "@/server/utils/dayRange";
import { daySchema, objectIdSchema } from "../registerReadTool";
import { registerWriteTool } from "../registerWriteTool";

const NOTE_MAX_LENGTH = 500;

const amountSchema = z
    .number()
    .int("Integer VND, no decimals")
    .positive()
    .describe("Integer VND, e.g. 150000");
const noteSchema = z
    .string()
    .max(NOTE_MAX_LENGTH)
    .optional()
    .describe("Short description as the user said it (Vietnamese is fine)");
const dateInput = {
    date: daySchema.optional().describe("Transaction day YYYY-MM-DD, Vietnam time. Omit for now."),
    time: z
        .string()
        .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm (24h)")
        .optional()
        .describe("HH:mm Vietnam time. Only used with date; past days without time are recorded at 12:00."),
};

// Không dùng cho phí đáo hạn: service chặn, chỉ ghi qua bản ghi đáo hạn
const AGENT_CARD_FEE_TYPES = Object.values(CardFeeType).filter(
    (type) => type !== CardFeeType.ROLLOVER_FEE,
) as [CardFeeType, ...CardFeeType[]];

/**
 * Ngày giờ giao dịch theo giờ VN gửi cho service (service vẫn tự kiểm `parseTransactionDate` + khóa sổ).
 * Không có ngày, hoặc là hôm nay mà không có giờ → để trống (service dùng thời điểm hiện tại).
 */
export function toTransactionDate(date?: string, time?: string, now = new Date()) {
    if (!date) return undefined;
    if (!time && date === vietnamDayKey(now)) return undefined;
    return `${date}T${time ?? "12:00"}:00+07:00`;
}

/** Tạo chi tiêu / thu nhập / chuyển tiền — chỉ đăng ký khi token có scope `write`. */
export function registerWriteTools(server: McpServer) {
    registerWriteTool(
        server,
        "create_expense",
        {
            title: "Create expense",
            idempotencyRoute: "expense.create",
            description:
                "Record money spent from a source (bank, cash, e-wallet or credit card). Decreases balance, or increases debt on a credit card (fails if over the credit limit). Resolve categoryId (kind EXPENSE) and sourceOfMoneyId with list_categories / list_sources_of_money first. Confirm amount, source and category with the user before calling. Returns the created expense.",
            inputSchema: {
                categoryId: objectIdSchema.describe("Expense category id (kind EXPENSE)"),
                sourceOfMoneyId: objectIdSchema.describe("Source of money id"),
                amount: amountSchema,
                note: noteSchema,
                ...dateInput,
                cardFeeType: z
                    .enum(AGENT_CARD_FEE_TYPES)
                    .optional()
                    .describe("Only when the expense IS a credit card fee/interest charged by the bank"),
                foreignFeeType: z
                    .nativeEnum(ForeignFeeType)
                    .optional()
                    .describe(
                        "Credit card only: FX = paid in foreign currency, INTL_VND = VND at a foreign merchant. Server adds the card's foreign transaction fee as a second expense.",
                    ),
            },
        },
        ({ date, time, ...input }) =>
            ExpensesService.createExpense({ ...input, spentAt: toTransactionDate(date, time) }),
    );

    registerWriteTool(
        server,
        "create_income",
        {
            title: "Create income",
            idempotencyRoute: "income.create",
            description:
                "Record money received into a non-credit-card source (salary, bonus, refund…). Increases balance. Resolve categoryId (kind INCOME) and sourceOfMoneyId first. Paying a credit card is a transfer, not an income.",
            inputSchema: {
                categoryId: objectIdSchema.describe("Income category id (kind INCOME)"),
                sourceOfMoneyId: objectIdSchema.describe("Source of money id, not a credit card"),
                amount: amountSchema,
                note: noteSchema,
                ...dateInput,
            },
        },
        ({ date, time, ...input }) =>
            IncomesService.createIncome({ ...input, receivedAt: toTransactionDate(date, time) }),
    );

    registerWriteTool(
        server,
        "create_transfer",
        {
            title: "Create transfer",
            idempotencyRoute: "transfer.create",
            description:
                "Move money between two of the user's own sources. Not income/expense. Allowed: normal → normal, normal → credit card (pays debt, amount <= current debt), credit card → normal (cash advance; debt += amount). Card → card is rejected. feePercent is only allowed when sending from a credit card: the receiver gets amount − fee and the fee is recorded as an expense in feeCategoryId (required then); the card's minimum cash-advance fee may apply. Transfers cannot be edited later, only deleted in the app.",
            inputSchema: {
                fromSourceId: objectIdSchema.describe("Sender source id"),
                toSourceId: objectIdSchema.describe("Receiver source id, different from sender"),
                amount: amountSchema.describe("Amount taken from the sender, integer VND"),
                feePercent: z
                    .number()
                    .min(0)
                    .max(100)
                    .optional()
                    .describe("Credit card sender only: fee in percent of amount, default 0"),
                feeCategoryId: objectIdSchema.optional().describe("Expense category for the fee"),
                note: noteSchema,
                ...dateInput,
            },
        },
        ({ date, time, ...input }) =>
            TransfersService.createTransfer({ ...input, transferredAt: toTransactionDate(date, time) }),
    );
}
