import type { Dayjs } from "dayjs";
import type { CardFeeType } from "@/libs/interfaces/expensesData";
import type {
    IDashboardCashflowSummary,
    IDashboardExpensesSummary,
} from "@/libs/interfaces/dashboardData";
import type {
    IAssetsSummary,
    ICreditCardFeeItem,
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
    creditCardFees: ICreditCardFeeItem[];
    assets: IAssetsSummary;
    isSourcesLoading: boolean;
    handleChangeMonth: (value: Dayjs | null) => void;
    handleCreateExpense: () => void;
    handleRecordCardFee: (item: ICreditCardFeeItem, feeType: CardFeeType) => void;
    handleViewDay: (day: number) => void;
}
