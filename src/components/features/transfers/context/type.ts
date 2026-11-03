import type { Dayjs } from "dayjs";
import type { ITransactionListResponse, PaginatedResponse } from "@/libs/interfaces/ApiResponseData";
import type {
    IFromTransfersData,
    ITransfersData,
} from "@/libs/interfaces/transfersData";
import type { TablePaginationConfig } from "antd/es/table";

/** Giá trị điền sẵn khi mở form tạo từ màn khác (VD: nút "Trả nợ" trên dashboard). */
export interface ITransferCreateDefaults {
    fromSourceId?: string;
    toSourceId?: string;
    amount?: number;
}

export interface ITransfersContextProps {
    search: string;
    fromSourceFilter: string;
    toSourceFilter: string;
    dateRange: [Dayjs | null, Dayjs | null] | null;
    page: number;
    pageSize: number;
    items: ITransfersData[];
    pagination?: PaginatedResponse<ITransfersData>["pagination"];
    /** Tổng của toàn bộ kết quả lọc */
    summary?: ITransactionListResponse<ITransfersData>["summary"];
    /** Tổng theo ngày cho các ngày trong trang hiện tại */
    dayTotals: NonNullable<ITransactionListResponse<ITransfersData>["dayTotals"]>;
    /** Phân bổ tổng theo danh mục / nơi nhận (toàn bộ kết quả lọc) */
    breakdown?: ITransactionListResponse<ITransfersData>["breakdown"];
    isLoading: boolean;
    modalOpen: boolean;
    createDefaults: ITransferCreateDefaults | null;
    isSubmitting: boolean;

    handleSearch: (value: string) => void;
    handleFromSourceFilter: (value: string) => void;
    handleToSourceFilter: (value: string) => void;
    handleDateRange: (range: [Dayjs | null, Dayjs | null] | null) => void;
    handleChangePage: (page: number) => void;
    handleTableChange: (pager: TablePaginationConfig) => void;
    openCreateModal: () => void;
    closeModal: () => void;
    handleSubmit: (
        values: IFromTransfersData,
        options?: { keepOpen?: boolean },
    ) => Promise<boolean>;
    handleDelete: (record: ITransfersData) => void;
}
