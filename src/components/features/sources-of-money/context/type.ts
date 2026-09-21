import type { PaginatedResponse } from "@/libs/interfaces/ApiResponseData";
import type {
    IFromSourcesOfMoneyData,
    ISourcesOfMoneyData,
    SourcesOfMoneyType,
} from "@/libs/interfaces/sourcesOfMoneyData";
import type { TablePaginationConfig } from "antd/es/table";

export interface ISourcesOfMoneyContextProps {
    // values
    search: string;
    typeFilter: SourcesOfMoneyType | "";
    page: number;
    pageSize: number;
    items: ISourcesOfMoneyData[];
    pagination?: PaginatedResponse<ISourcesOfMoneyData>["pagination"];
    isLoading: boolean;
    modalOpen: boolean;
    editingItem: ISourcesOfMoneyData | null;
    isSubmitting: boolean;

    // handlers
    handleSearch: (value: string) => void;
    handleTypeFilter: (value: SourcesOfMoneyType | "") => void;
    handleChangePage: (page: number) => void;
    handleChangePageSize: (pageSize: number) => void;
    handleTableChange: (pager: TablePaginationConfig) => void;
    openCreateModal: () => void;
    openEditModal: (record: ISourcesOfMoneyData) => void;
    closeModal: () => void;
    handleSubmit: (values: IFromSourcesOfMoneyData) => Promise<void>;
    handleDelete: (record: ISourcesOfMoneyData) => void;
}
