import type { Dayjs } from "dayjs";
import type { ITransactionListResponse, PaginatedResponse } from "@/libs/interfaces/ApiResponseData";
import type {
    IExpenseCreateDefaults,
    IExpensesData,
    IFromExpensesData,
} from "@/libs/interfaces/expensesData";
import type { IPageChange } from "@/components/common/pagination";

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
    /** Tổng của toàn bộ kết quả lọc */
    summary?: ITransactionListResponse<IExpensesData>["summary"];
    /** Tổng theo ngày cho các ngày trong trang hiện tại */
    dayTotals: NonNullable<ITransactionListResponse<IExpensesData>["dayTotals"]>;
    /** Phân bổ tổng theo danh mục / nơi nhận (toàn bộ kết quả lọc) */
    breakdown?: ITransactionListResponse<IExpensesData>["breakdown"];
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
    handleTableChange: (pager: IPageChange) => void;
    openCreateModal: () => void;
    openEditModal: (record: IExpensesData) => void;
    closeModal: () => void;
    handleSubmit: (
        values: IFromExpensesData,
        options?: { keepOpen?: boolean },
    ) => Promise<boolean>;
    handleDelete: (record: IExpensesData) => void;
}
