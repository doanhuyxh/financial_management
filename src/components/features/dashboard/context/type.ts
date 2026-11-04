import type { Dayjs } from "dayjs";
import type { CardFeeType } from "@/libs/interfaces/expensesData";
import type { ICardRolloverData, IFromCardRolloverData } from "@/libs/interfaces/cardRolloversData";
import type { ISourcesOfMoneyData } from "@/libs/interfaces/sourcesOfMoneyData";
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
    handlePayCard: (cardId: string, amount: number) => void;
    handleRecordCardFee: (item: ICreditCardFeeItem, feeType: CardFeeType) => void;
    handleViewDay: (day: number) => void;
    /** Thẻ đang mở modal đáo hạn (null = đóng); lấy từ danh sách nguồn nên dư nợ luôn mới */
    rolloverSource: ISourcesOfMoneyData | null;
    openRollover: (cardId: string) => void;
    closeRollover: () => void;
    /** Các lần đáo hạn gần đây của thẻ đang mở */
    rolloverItems: ICardRolloverData[];
    isRolloverLoading: boolean;
    isRolloverSubmitting: boolean;
    handleRolloverSubmit: (values: IFromCardRolloverData) => Promise<boolean>;
    handleDeleteRollover: (item: ICardRolloverData) => void;
}
