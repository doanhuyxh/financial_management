import type { Dayjs } from "dayjs";
import type { ITransactionListResponse, PaginatedResponse } from "@/libs/interfaces/ApiResponseData";
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
    /** Tổng của toàn bộ kết quả lọc */
    summary?: ITransactionListResponse<IIncomesData>["summary"];
    /** Tổng theo ngày cho các ngày trong trang hiện tại */
    dayTotals: NonNullable<ITransactionListResponse<IIncomesData>["dayTotals"]>;
    /** Phân bổ tổng theo danh mục / nơi nhận (toàn bộ kết quả lọc) */
    breakdown?: ITransactionListResponse<IIncomesData>["breakdown"];
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
