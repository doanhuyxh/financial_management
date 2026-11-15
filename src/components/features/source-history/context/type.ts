import type { PaginatedResponse, IListBreakdownItem } from "@/libs/interfaces/ApiResponseData";
import type { ISourcesOfMoneyData } from "@/libs/interfaces/sourcesOfMoneyData";
import type {
    ISourceTransactionData,
    ISourceTransactionSummary,
    SourceTransactionFilter,
} from "@/libs/interfaces/sourceTransactionsData";
import type {
    ICreatedShareLinkData,
    IFromShareLinkData,
    IShareLinkData,
} from "@/libs/interfaces/shareLinksData";

/** YYYY-MM-DD */
export type HistoryDateRange = { from?: string; to?: string };

export interface ISourceHistoryContextProps {
    // values
    /** Id nguồn tiền lấy từ URL `/source-history/<id>`. */
    sourceId: string;
    /** Nguồn đang xem; null khi đang tải hoặc không tìm thấy. */
    source: ISourcesOfMoneyData | null;
    /** Mọi nguồn tiền (để đổi nhanh sang nguồn khác). */
    sources: ISourcesOfMoneyData[];
    isSourceLoading: boolean;
    isCreditCard: boolean;
    /** Bộ lọc đọc từ query `?kind=&from=&to=&page=`. */
    kind: SourceTransactionFilter | "";
    range: HistoryDateRange;
    items: ISourceTransactionData[];
    pagination?: PaginatedResponse<ISourceTransactionData>["pagination"];
    summary?: ISourceTransactionSummary;
    /** Khoản chi theo danh mục trên toàn bộ kết quả lọc. */
    breakdown: IListBreakdownItem[];
    isLoading: boolean;
    shareModalOpen: boolean;
    shareLinks: IShareLinkData[];
    isShareLinksLoading: boolean;
    isCreatingShareLink: boolean;
    /** Link vừa tạo (token chỉ có một lần), null khi chưa tạo. */
    createdShareLink: ICreatedShareLinkData | null;

    // handlers
    handleSelectSource: (sourceId: string) => void;
    handleBack: () => void;
    handlePageChange: (page: number) => void;
    handleKindChange: (kind: SourceTransactionFilter | "") => void;
    handleRangeChange: (range: HistoryDateRange) => void;
    openShareModal: () => void;
    closeShareModal: () => void;
    handleCreateShareLink: (values: IFromShareLinkData) => Promise<void>;
    handleRevokeShareLink: (link: IShareLinkData) => void;
}
