import type { Dayjs } from "dayjs";
import type { PaginatedResponse } from "@/libs/interfaces/ApiResponseData";
import type {
    IFromIncomesData,
    IIncomesData,
} from "@/libs/interfaces/incomesData";
import type { TablePaginationConfig } from "antd/es/table";

export interface IIncomesContextProps {
    // values
    search: string;
    categoryFilter: string;
    sourceFilter: string;
    dateRange: [Dayjs | null, Dayjs | null] | null;
    page: number;
    pageSize: number;
    items: IIncomesData[];
    pagination?: PaginatedResponse<IIncomesData>["pagination"];
    isLoading: boolean;
    modalOpen: boolean;
    editingItem: IIncomesData | null;
    isSubmitting: boolean;

    // handlers
    handleSearch: (value: string) => void;
    handleCategoryFilter: (value: string) => void;
    handleSourceFilter: (value: string) => void;
    handleDateRange: (range: [Dayjs | null, Dayjs | null] | null) => void;
    handleChangePage: (page: number) => void;
    handleTableChange: (pager: TablePaginationConfig) => void;
    openCreateModal: () => void;
    openEditModal: (record: IIncomesData) => void;
    closeModal: () => void;
    handleSubmit: (
        values: IFromIncomesData,
        options?: { keepOpen?: boolean },
    ) => Promise<boolean>;
    handleDelete: (record: IIncomesData) => void;
}
