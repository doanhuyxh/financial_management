import type { Dayjs } from "dayjs";
import type { PaginatedResponse } from "@/libs/interfaces/ApiResponseData";
import type {
    IFromTransfersData,
    ITransfersData,
} from "@/libs/interfaces/transfersData";
import type { TablePaginationConfig } from "antd/es/table";

export interface ITransfersContextProps {
    search: string;
    fromSourceFilter: string;
    toSourceFilter: string;
    dateRange: [Dayjs | null, Dayjs | null] | null;
    page: number;
    pageSize: number;
    items: ITransfersData[];
    pagination?: PaginatedResponse<ITransfersData>["pagination"];
    isLoading: boolean;
    modalOpen: boolean;
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
