export default interface ApiResponse<T> {
    status: boolean;
    message: string;
    data: T;
    statusCode: number;
}

/** Tổng của toàn bộ kết quả lọc (danh sách giao dịch). */
export interface IListSummary {
    count: number;
    totalAmount: number;
    /** Chỉ có ở chuyển tiền */
    totalFee?: number;
}

/** Tổng theo ngày (YYYY-MM-DD, giờ VN) cho các ngày có trong trang hiện tại. */
export interface IDayTotal {
    date: string;
    total: number;
}

export interface PaginatedResponse<T> {
    items: T[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

/** Danh sách chi tiêu / thu nhập / chuyển tiền: thêm tổng theo bộ lọc và tổng theo ngày. */
export interface ITransactionListResponse<T> extends PaginatedResponse<T> {
    summary?: IListSummary;
    dayTotals?: IDayTotal[];
}