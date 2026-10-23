import type { Dayjs } from "dayjs";
import type {
    IDashboardCashflowSummary,
    IDashboardExpensesSummary,
} from "@/libs/interfaces/dashboardData";
import type { IBudgetData } from "@/libs/interfaces/budgetsData";
import type {
    IAssetsSummary,
    ICreditCardDebtItem,
} from "@/components/features/dashboard/utils";

export interface IDashboardContextProps {
    monthValue: Dayjs;
    summary?: IDashboardExpensesSummary;
    isLoading: boolean;
    cashflow?: IDashboardCashflowSummary;
    isCashflowLoading: boolean;
    budgets: IBudgetData[];
    isBudgetsLoading: boolean;
    creditCardDebts: ICreditCardDebtItem[];
    totalCreditDebt: number;
    assets: IAssetsSummary;
    isSourcesLoading: boolean;
    handleChangeMonth: (value: Dayjs | null) => void;
    handleCreateExpense: () => void;
    handleOpenBudgets: () => void;
    handleViewDay: (day: number) => void;
}
