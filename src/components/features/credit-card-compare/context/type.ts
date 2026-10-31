import type {
    IBestPick,
    ICardMetrics,
    ICardVerdict,
    ICompareScenario,
} from "@/components/features/credit-card-compare/utils";

export interface ICreditCardCompareContextProps {
    // values
    scenario: ICompareScenario;
    cards: ICardMetrics[];
    bestPicks: IBestPick[];
    verdicts: Map<string, ICardVerdict>;
    isLoading: boolean;

    // handlers
    handleScenarioChange: (patch: Partial<ICompareScenario>) => void;
    handleResetScenario: () => void;
}
