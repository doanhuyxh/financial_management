import type { ILatePenalty } from "@/components/features/dashboard/utils";
import { formatMoney } from "@/libs/utils/formatMoney";

/** Lãi suất (kèm lãi ước tính trên dư nợ hiện tại) và quy tắc phí chậm thanh toán. */
export default function LatePenaltyInfo({ penalty }: { penalty: ILatePenalty | null }) {
    if (!penalty) return <span className="text-muted-foreground">—</span>;
    const { interestRate, estimatedMonthlyInterest, lateFeePercentPerDay, lateFeeMin, lateFeeMax } =
        penalty;
    const lateRange = [
        lateFeeMin != null ? `tối thiểu ${formatMoney(lateFeeMin)}` : null,
        lateFeeMax != null ? `tối đa ${formatMoney(lateFeeMax)}` : null,
    ].filter(Boolean);

    return (
        <div className="flex flex-col gap-1">
            {interestRate != null ? <span>Lãi {interestRate}%/năm</span> : null}
            {estimatedMonthlyInterest ? (
                <span className="text-xs text-muted-foreground">
                    Không trả hết dư nợ: ~{formatMoney(estimatedMonthlyInterest)}/30 ngày
                </span>
            ) : null}
            {lateFeePercentPerDay != null || lateRange.length > 0 ? (
                <span className="text-xs text-muted-foreground">
                    Chậm trả:{" "}
                    {lateFeePercentPerDay != null
                        ? `${lateFeePercentPerDay}%/ngày trên số tối thiểu chưa trả`
                        : ""}
                    {lateRange.length > 0 ? ` (${lateRange.join(", ")})` : ""}
                </span>
            ) : null}
        </div>
    );
}
