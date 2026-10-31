import type { Dayjs } from "dayjs";
import type {
    IDashboardCashflowSummary,
    IDashboardExpensesSummary,
} from "@/libs/interfaces/dashboardData";
import type {
    IAnnualFeeItem,
    IAssetsSummary,
    ICreditCardDebtItem,
} from "@/components/features/dashboard/utils";

export interface IDashboardContextProps {
    monthValue: Dayjs;
    summary?: IDashboardExpensesSummary;
    isLoading: boolean;
    cashflow?: IDashboardCashflowSummary;
    isCashflowLoading: boolean;
    creditCardDebts: ICreditCardDebtItem[];
    totalCreditDebt: number;
    annualFees: IAnnualFeeItem[];
    assets: IAssetsSummary;
    isSourcesLoading: boolean;
    handleChangeMonth: (value: Dayjs | null) => void;
    handleCreateExpense: () => void;
    handleRecordAnnualFee: (item: IAnnualFeeItem) => void;
    handleViewDay: (day: number) => void;
}
