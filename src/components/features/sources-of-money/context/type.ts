import type {
    IFromSourcesOfMoneyData,
    ISourcesOfMoneyData,
    SourcesOfMoneyType,
} from "@/libs/interfaces/sourcesOfMoneyData";
import type { IFromTransfersData } from "@/libs/interfaces/transfersData";
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
    /** Ẩn nguồn trống: nguồn thường số dư = 0, thẻ tín dụng dư nợ = 0. */
    hideEmpty: boolean;
    hiddenCount: number;
    items: ISourcesOfMoneyData[];
    isLoading: boolean;
    isReordering: boolean;
    /** False while search/type filter/hide empty is active (list is only a subset). */
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
}
