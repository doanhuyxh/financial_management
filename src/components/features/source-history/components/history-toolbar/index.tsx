"use client";

import dayjs from "dayjs";
import Segmented, { type ISegmentedOption } from "@/components/common/segmented";
import TransactionDateRange from "@/components/common/transaction-date-range";
import { useSourceHistoryContext } from "@/components/features/source-history/context";
import { useIsMobile } from "@/libs/hooks/use-mobile";
import { SourceTransactionFilter } from "@/libs/interfaces/sourceTransactionsData";

const DAY_FORMAT = "YYYY-MM-DD";

/** Segmented cần giá trị khác rỗng, nên "Tất cả" (bộ lọc "") dùng khóa riêng. */
const ALL_KINDS = "ALL";
type KindOption = SourceTransactionFilter | typeof ALL_KINDS;

const KIND_OPTIONS: ISegmentedOption<KindOption>[] = [
    { value: ALL_KINDS, label: "Tất cả" },
    { value: SourceTransactionFilter.EXPENSE, label: "Chi" },
    { value: SourceTransactionFilter.INCOME, label: "Thu" },
    { value: SourceTransactionFilter.TRANSFER, label: "Chuyển" },
    { value: SourceTransactionFilter.ADJUSTMENT, label: "Điều chỉnh" },
];

/** Chỉ thẻ tín dụng mới có đáo hạn. */
const CREDIT_KIND_OPTIONS: ISegmentedOption<KindOption>[] = [
    ...KIND_OPTIONS,
    { value: SourceTransactionFilter.ROLLOVER, label: "Đáo hạn" },
];

/** Bộ lọc loại giao dịch và khoảng ngày (có chọn nhanh). */
export default function HistoryToolbar() {
    const { isCreditCard, kind, range, handleKindChange, handleRangeChange } = useSourceHistoryContext();
    const isMobile = useIsMobile();

    return (
        <div className="flex flex-wrap items-center gap-3">
            <Segmented<KindOption>
                block={isMobile}
                aria-label="Loại giao dịch"
                value={kind || ALL_KINDS}
                options={isCreditCard ? CREDIT_KIND_OPTIONS : KIND_OPTIONS}
                onChange={(value) => handleKindChange(value === ALL_KINDS ? "" : value)}
            />
            <TransactionDateRange
                layout={isMobile ? "drawer" : "desktop"}
                value={[
                    range.from ? dayjs(range.from, DAY_FORMAT) : null,
                    range.to ? dayjs(range.to, DAY_FORMAT) : null,
                ]}
                onChange={(next) =>
                    handleRangeChange({
                        from: next?.[0]?.format(DAY_FORMAT),
                        to: next?.[1]?.format(DAY_FORMAT),
                    })
                }
            />
        </div>
    );
}
