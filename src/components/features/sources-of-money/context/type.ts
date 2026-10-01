import type {
    IFromSourcesOfMoneyData,
    ISourcesOfMoneyData,
    SourcesOfMoneyType,
} from "@/libs/interfaces/sourcesOfMoneyData";
import type { IFromTransfersData } from "@/libs/interfaces/transfersData";

export interface ISourcesOfMoneyContextProps {
    // values
    search: string;
    typeFilter: SourcesOfMoneyType | "";
    items: ISourcesOfMoneyData[];
    isLoading: boolean;
    isReordering: boolean;
    modalOpen: boolean;
    editingItem: ISourcesOfMoneyData | null;
    isSubmitting: boolean;
    transferModalOpen: boolean;
    isTransferSubmitting: boolean;

    // handlers
    handleSearch: (value: string) => void;
    handleTypeFilter: (value: SourcesOfMoneyType | "") => void;
    handleReorder: (orderedItems: ISourcesOfMoneyData[]) => Promise<void>;
    openCreateModal: () => void;
    openEditModal: (record: ISourcesOfMoneyData) => void;
    closeModal: () => void;
    handleSubmit: (values: IFromSourcesOfMoneyData) => Promise<void>;
    handleDelete: (record: ISourcesOfMoneyData) => void;
    openTransferModal: () => void;
    closeTransferModal: () => void;
    handleTransferSubmit: (
        values: IFromTransfersData,
        options?: { keepOpen?: boolean },
    ) => Promise<boolean>;
}
