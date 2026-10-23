import type {
    IFromSourcesOfMoneyData,
    ISourcesOfMoneyData,
    SourcesOfMoneyType,
} from "@/libs/interfaces/sourcesOfMoneyData";
import type { IFromTransfersData } from "@/libs/interfaces/transfersData";
import type { IBalanceAdjustmentData } from "@/libs/interfaces/balanceAdjustmentsData";
import type { PaginatedResponse } from "@/libs/interfaces/ApiResponseData";

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
    /** Nguồn đang xem lịch sử điều chỉnh số dư/dư nợ (null = đóng). */
    historySource: ISourcesOfMoneyData | null;
    historyItems: IBalanceAdjustmentData[];
    historyPagination?: PaginatedResponse<IBalanceAdjustmentData>["pagination"];
    isHistoryLoading: boolean;

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
    openTransferModal: () => void;
    closeTransferModal: () => void;
    handleTransferSubmit: (
        values: IFromTransfersData,
        options?: { keepOpen?: boolean },
    ) => Promise<boolean>;
}
