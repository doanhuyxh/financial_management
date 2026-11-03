import type { Dayjs } from "dayjs";
import type { CardFeeType } from "@/libs/interfaces/expensesData";
import type {
    IDashboardCashflowSummary,
    IDashboardExpensesSummary,
} from "@/libs/interfaces/dashboardData";
import type { IAssetsSummary } from "@/libs/utils/assetsSummary";
import type {
    IAttentionItem,
    ICreditCardFeeItem,
    ICreditCardOverviewItem,
} from "@/components/features/dashboard/utils";

export interface IDashboardContextProps {
    monthValue: Dayjs;
    summary?: IDashboardExpensesSummary;
    isLoading: boolean;
    cashflow?: IDashboardCashflowSummary;
    isCashflowLoading: boolean;
    /** Mọi thẻ tín dụng: dư nợ, hạn trả, phí (thẻ còn nợ lên trước) */
    creditCards: ICreditCardOverviewItem[];
    attentionItems: IAttentionItem[];
    totalCreditDebt: number;
    assets: IAssetsSummary;
    isSourcesLoading: boolean;
    handleChangeMonth: (value: Dayjs | null) => void;
    handleCreateExpense: () => void;
    handlePayCard: (cardId: string, amount: number) => void;
    handleRecordCardFee: (item: ICreditCardFeeItem, feeType: CardFeeType) => void;
    handleViewDay: (day: number) => void;
}
