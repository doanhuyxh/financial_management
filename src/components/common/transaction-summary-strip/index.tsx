import type { Dayjs } from "dayjs";
import Money, { type MoneyKind } from "@/components/common/money";
import type { IListSummary } from "@/libs/interfaces/ApiResponseData";
import { formatMoney } from "@/libs/utils/formatMoney";

interface ITransactionSummaryStripProps {
    summary?: IListSummary;
    /** VD: "khoản chi", "khoản thu", "giao dịch" */
    unit: string;
    kind: MoneyKind;
    /** Khoảng ngày đang lọc: có đủ 2 đầu thì hiện trung bình / ngày */
    dateRange?: [Dayjs | null, Dayjs | null] | null;
}

/** Dải tổng của toàn bộ kết quả lọc, đặt ngay trên danh sách giao dịch. */
export default function TransactionSummaryStrip({
    summary,
    unit,
    kind,
    dateRange,
}: ITransactionSummaryStripProps) {
    if (!summary) return null;
    const [from, to] = dateRange ?? [];
    const days = from && to ? to.startOf("day").diff(from.startOf("day"), "day") + 1 : 0;
    const signedValue = kind === "out" ? -summary.totalAmount : summary.totalAmount;

    return (
        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 rounded-xl border border-border bg-card px-4 py-3">
            <span className="text-xs text-muted-foreground">
                {summary.count.toLocaleString("vi-VN")} {unit}
                {days ? ` trong ${days} ngày` : ""}
            </span>
            <Money
                value={signedValue}
                kind={kind}
                signed={kind === "out" || kind === "in"}
                className="text-lg font-bold"
            />
            {summary.totalFee ? (
                <span className="text-xs text-muted-foreground">
                    Phí: <Money value={summary.totalFee} kind="out" />
                </span>
            ) : null}
            {days ? (
                <span className="money-value text-xs text-muted-foreground">
                    TB {formatMoney(summary.totalAmount / days)}/ngày
                </span>
            ) : null}
        </div>
    );
}
