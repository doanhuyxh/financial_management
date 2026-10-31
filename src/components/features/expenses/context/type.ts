import type { Dayjs } from "dayjs";
import type { PaginatedResponse } from "@/libs/interfaces/ApiResponseData";
import type {
    IExpenseCreateDefaults,
    IExpensesData,
    IFromExpensesData,
} from "@/libs/interfaces/expensesData";
import type { TablePaginationConfig } from "antd/es/table";

export interface IExpensesContextProps {
    // values
    search: string;
    categoryFilter: string;
    sourceFilter: string;
    dateRange: [Dayjs | null, Dayjs | null] | null;
    page: number;
    pageSize: number;
    items: IExpensesData[];
    pagination?: PaginatedResponse<IExpensesData>["pagination"];
    isLoading: boolean;
    modalOpen: boolean;
    editingItem: IExpensesData | null;
    createDefaults: IExpenseCreateDefaults | null;
    isSubmitting: boolean;

    // handlers
    handleSearch: (value: string) => void;
    handleCategoryFilter: (value: string) => void;
    handleSourceFilter: (value: string) => void;
    handleDateRange: (range: [Dayjs | null, Dayjs | null] | null) => void;
    handleChangePage: (page: number) => void;
    handleTableChange: (pager: TablePaginationConfig) => void;
    openCreateModal: () => void;
    openEditModal: (record: IExpensesData) => void;
    closeModal: () => void;
    handleSubmit: (
        values: IFromExpensesData,
        options?: { keepOpen?: boolean },
    ) => Promise<boolean>;
    handleDelete: (record: IExpensesData) => void;
}
