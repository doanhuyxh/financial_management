import type { IAssetsSummary } from "@/libs/utils/assetsSummary";
import type {
    IFromSourcesOfMoneyData,
    ISourcesOfMoneyData,
    SourcesOfMoneyType,
} from "@/libs/interfaces/sourcesOfMoneyData";
import type { IFromTransfersData } from "@/libs/interfaces/transfersData";
import type { ICardRolloverData, IFromCardRolloverData } from "@/libs/interfaces/cardRolloversData";
import type {
    ISourceTransactionData,
    ISourceTransactionSummary,
    SourceTransactionFilter,
} from "@/libs/interfaces/sourceTransactionsData";
import type { PaginatedResponse } from "@/libs/interfaces/ApiResponseData";
import type {
    ICreatedShareLinkData,
    IFromShareLinkData,
    IShareLinkData,
} from "@/libs/interfaces/shareLinksData";

/** YYYY-MM-DD */
export type HistoryDateRange = { from?: string; to?: string };

export interface ISourcesOfMoneyContextProps {
    // values
    search: string;
    typeFilter: SourcesOfMoneyType | "";
    /** Ẩn nguồn trống: chỉ nguồn thường có số dư = 0 (thẻ tín dụng luôn hiện). Mặc định bật. */
    hideEmpty: boolean;
    hiddenCount: number;
    items: ISourcesOfMoneyData[];
    /** Tổng hợp trên toàn bộ nguồn (không theo bộ lọc) */
    assets: IAssetsSummary;
    isLoading: boolean;
    isReordering: boolean;
    /** False khi đang tìm kiếm / lọc loại (danh sách tải về chỉ là một phần). */
    canReorder: boolean;
    modalOpen: boolean;
    editingItem: ISourcesOfMoneyData | null;
    isSubmitting: boolean;
    transferModalOpen: boolean;
    isTransferSubmitting: boolean;
    /** Nguồn đang xem lịch sử giao dịch (null = đóng). */
    historySource: ISourcesOfMoneyData | null;
    historyKind: SourceTransactionFilter | "";
    historyRange: HistoryDateRange;
    historyItems: ISourceTransactionData[];
    historyPagination?: PaginatedResponse<ISourceTransactionData>["pagination"];
    historySummary?: ISourceTransactionSummary;
    isHistoryLoading: boolean;
    /** Modal quản lý link chia sẻ của historySource. */
    shareModalOpen: boolean;
    shareLinks: IShareLinkData[];
    isShareLinksLoading: boolean;
    isCreatingShareLink: boolean;
    /** Link vừa tạo (token chỉ có một lần), null khi chưa tạo. */
    createdShareLink: ICreatedShareLinkData | null;
    /** Nguồn ngân hàng đang hiện mã VietQR (null = đóng). */
    qrSource: ISourcesOfMoneyData | null;

    // handlers
    handleSearch: (value: string) => void;
    handleTypeFilter: (value: SourcesOfMoneyType | "") => void;
    handleHideEmpty: (value: boolean) => void;
    handleReorder: (orderedItems: ISourcesOfMoneyData[]) => Promise<void>;
    openCreateModal: () => void;
    openEditModal: (record: ISourcesOfMoneyData) => void;
    closeModal: () => void;
    handleSubmit: (values: IFromSourcesOfMoneyData) => Promise<void>;
    handleDelete: (record: ISourcesOfMoneyData) => void;
    openHistory: (record: ISourcesOfMoneyData) => void;
    closeHistory: () => void;
    handleHistoryPageChange: (page: number) => void;
    handleHistoryKindChange: (kind: SourceTransactionFilter | "") => void;
    handleHistoryRangeChange: (range: HistoryDateRange) => void;
    openShareModal: () => void;
    closeShareModal: () => void;
    handleCreateShareLink: (values: IFromShareLinkData) => Promise<void>;
    handleRevokeShareLink: (link: IShareLinkData) => void;
    openQr: (record: ISourcesOfMoneyData) => void;
    closeQr: () => void;
    openTransferModal: () => void;
    closeTransferModal: () => void;
    handleTransferSubmit: (
        values: IFromTransfersData,
        options?: { keepOpen?: boolean },
    ) => Promise<boolean>;
    /** Thẻ đang mở modal đáo hạn (null = đóng). */
    rolloverSource: ISourcesOfMoneyData | null;
    openRollover: (cardId: string) => void;
    closeRollover: () => void;
    rolloverItems: ICardRolloverData[];
    isRolloverLoading: boolean;
    isRolloverSubmitting: boolean;
    handleRolloverSubmit: (values: IFromCardRolloverData) => Promise<boolean>;
    handleDeleteRollover: (item: ICardRolloverData) => void;
}
