import type { IAssetsSummary } from "@/libs/utils/assetsSummary";
import type {
    IFromSourcesOfMoneyData,
    ISourcesOfMoneyData,
    SourcesOfMoneyType,
} from "@/libs/interfaces/sourcesOfMoneyData";
import type { IFromTransfersData } from "@/libs/interfaces/transfersData";
import type { ICardRolloverData, IFromCardRolloverData } from "@/libs/interfaces/cardRolloversData";

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
