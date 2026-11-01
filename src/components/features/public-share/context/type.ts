import type { DayRange } from "@/components/common/day-range-filter";
import type { PaginatedResponse } from "@/libs/interfaces/ApiResponseData";
import type {
    IPublicShareInfo,
    IPublicSourceTransactionData,
} from "@/libs/interfaces/sourceTransactionsData";

export interface IPublicShareContextProps {
    info?: IPublicShareInfo;
    isInfoLoading: boolean;
    /** Link sai, hết hạn hoặc đã thu hồi (server trả 404 như nhau). */
    isNotFound: boolean;
    isCreditCard: boolean;
    range: DayRange;
    items: IPublicSourceTransactionData[];
    pagination?: PaginatedResponse<IPublicSourceTransactionData>["pagination"];
    isTransactionsLoading: boolean;
    handleRangeChange: (range: DayRange) => void;
    handlePageChange: (page: number) => void;
}
