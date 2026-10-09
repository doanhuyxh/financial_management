import type { Dayjs } from "dayjs";
import type { IDashboardExpensesSummary } from "@/libs/interfaces/dashboardData";
import type { ICreditCardDebtItem } from "@/components/features/dashboard/utils";

export interface IDashboardContextProps {
    monthValue: Dayjs;
    summary?: IDashboardExpensesSummary;
    isLoading: boolean;
    creditCardDebts: ICreditCardDebtItem[];
    totalCreditDebt: number;
    isCreditCardsLoading: boolean;
    handleChangeMonth: (value: Dayjs | null) => void;
    handleCreateExpense: () => void;
}
