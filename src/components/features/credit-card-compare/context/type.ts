import type {
    IBestPick,
    ICardMetrics,
    ICardVerdict,
    ICompareScenario,
} from "@/components/features/credit-card-compare/utils";

export interface ICreditCardCompareContextProps {
    // values
    scenario: ICompareScenario;
    /** Mọi thẻ tín dụng */
    allCards: ICardMetrics[];
    /** Thẻ người dùng chọn hiển thị; mọi khối so sánh dùng danh sách này */
    cards: ICardMetrics[];
    hiddenCardIds: string[];
    bestPicks: IBestPick[];
    verdicts: Map<string, ICardVerdict>;
    isLoading: boolean;

    // handlers
    handleScenarioChange: (patch: Partial<ICompareScenario>) => void;
    handleResetScenario: () => void;
    handleHiddenCardsChange: (hiddenCardIds: string[]) => void;
}
