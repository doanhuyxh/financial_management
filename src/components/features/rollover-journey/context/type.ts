import type { ICardRolloverData, IFromCardRolloverData } from "@/libs/interfaces/cardRolloversData";
import type {
    IFromEndRolloverJourneyData,
    IRolloverJourneyData,
    IRolloverJourneyDetail,
} from "@/libs/interfaces/rolloverJourneysData";
import type { ISourcesOfMoneyData } from "@/libs/interfaces/sourcesOfMoneyData";
import type { IJourneyComputed, JourneyView } from "@/components/features/rollover-journey/utils";

export interface IRolloverJourneyContextProps {
    /** Mọi thẻ tín dụng (chưa lưu trữ) */
    cards: ISourcesOfMoneyData[];
    selectedCard: ISourcesOfMoneyData | null;
    /** Mọi hành trình của user (đang mở trước) */
    journeys: IRolloverJourneyData[];
    /** Hành trình của thẻ đang chọn */
    cardJourneys: IRolloverJourneyData[];
    selectedJourney: IRolloverJourneyData | null;
    detail: IRolloverJourneyDetail | null;
    computed: IJourneyComputed | null;
    view: JourneyView;
    isLoading: boolean;
    isDetailLoading: boolean;
    handleSelectCard: (cardId: string) => void;
    handleSelectJourney: (journeyId: string) => void;
    setView: (view: JourneyView) => void;
    // Ghi đáo hạn (modal dùng chung)
    rolloverSource: ISourcesOfMoneyData | null;
    openRollover: () => void;
    closeRollover: () => void;
    rolloverItems: ICardRolloverData[];
    isRolloverLoading: boolean;
    isRolloverSubmitting: boolean;
    handleRolloverSubmit: (values: IFromCardRolloverData) => Promise<boolean>;
    handleDeleteRollover: (item: ICardRolloverData) => void;
    // Kết thúc / sửa gốc
    endModalOpen: boolean;
    openEndModal: () => void;
    closeEndModal: () => void;
    handleEndJourney: (values: IFromEndRolloverJourneyData) => Promise<void>;
    isEnding: boolean;
    baseModalOpen: boolean;
    openBaseModal: () => void;
    closeBaseModal: () => void;
    handleUpdateBase: (baseAmount: number) => Promise<void>;
    isUpdatingBase: boolean;
}
