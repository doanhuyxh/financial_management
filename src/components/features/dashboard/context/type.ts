import type { Dayjs } from "dayjs";
import type { IDashboardExpensesSummary } from "@/libs/interfaces/dashboardData";
import type {
    IAssetsSummary,
    ICreditCardDebtItem,
} from "@/components/features/dashboard/utils";

export interface IDashboardContextProps {
    monthValue: Dayjs;
    summary?: IDashboardExpensesSummary;
    isLoading: boolean;
    creditCardDebts: ICreditCardDebtItem[];
    totalCreditDebt: number;
    assets: IAssetsSummary;
    isSourcesLoading: boolean;
    handleChangeMonth: (value: Dayjs | null) => void;
    handleCreateExpense: () => void;
    handleViewDay: (day: number) => void;
}
