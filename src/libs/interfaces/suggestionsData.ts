/** Gợi ý cho form chi tiêu / thu nhập (xếp theo tần suất có trọng số thời gian). */
export interface ITransactionSuggestions {
    /** Danh mục hay dùng, xếp giảm dần theo điểm. */
    categoryIds: string[];
    /** Nguồn tiền hay dùng, xếp giảm dần theo điểm. */
    sourceIds: string[];
    /** Số tiền hay dùng nói chung, tăng dần. */
    topAmounts: number[];
    /** Theo từng danh mục: số tiền hay dùng (tăng dần) và nguồn tiền hay dùng nhất. */
    byCategory: Record<string, { amounts: number[]; sourceId: string | null }>;
}

export interface ITransferPairSuggestion {
    fromSourceId: string;
    toSourceId: string;
    /** Số tiền hay chuyển cho cặp này, tăng dần. */
    amounts: number[];
}

export interface ITransferSuggestions {
    /** Cặp nguồn hay chuyển, xếp giảm dần theo điểm. */
    pairs: ITransferPairSuggestion[];
    /** Nguồn hay dùng làm bên chuyển. */
    fromSourceIds: string[];
    /** Số tiền hay chuyển nói chung, tăng dần. */
    topAmounts: number[];
}
