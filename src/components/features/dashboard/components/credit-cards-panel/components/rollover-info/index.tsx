import type { IRolloverStatus } from "@/components/features/dashboard/utils";
import { formatMoney } from "@/libs/utils/formatMoney";

/** Phí đáo hạn ước tính trên dư nợ hiện tại, so với lãi nếu không trả hết, và số lần đã đáo trong kỳ. */
export default function RolloverInfo({ status }: { status: IRolloverStatus | null }) {
    if (!status) return <span className="text-muted-foreground">—</span>;
    const { feePercent, estimatedFee, estimatedMonthlyInterest, cycleCount, cycleFee } = status;
    const cheaperThanInterest =
        estimatedFee != null && estimatedMonthlyInterest != null
            ? estimatedFee < estimatedMonthlyInterest
            : null;

    return (
        <div className="flex flex-col gap-1">
            {feePercent != null ? (
                <span className="font-semibold text-warn">Phí {feePercent}%/lần</span>
            ) : (
                <span className="text-xs text-muted-foreground">Chưa cấu hình % phí</span>
            )}
            {estimatedFee != null ? (
                <span className="text-xs text-muted-foreground">
                    Đáo hết dư nợ: ≈{formatMoney(estimatedFee)}
                    {estimatedMonthlyInterest != null
                        ? ` · lãi nếu không trả ≈${formatMoney(estimatedMonthlyInterest)}/30 ngày`
                        : ""}
                </span>
            ) : null}
            {cheaperThanInterest != null ? (
                <span className={cheaperThanInterest ? "text-xs text-money-in" : "text-xs text-debt"}>
                    {cheaperThanInterest
                        ? "Rẻ hơn lãi 30 ngày, nhưng dư nợ không giảm"
                        : "Đắt hơn lãi 30 ngày, nên trả tối thiểu hoặc trả góp"}
                </span>
            ) : null}
            {cycleCount != null ? (
                <span className={cycleCount > 0 ? "text-xs font-medium text-debt" : "text-xs text-muted-foreground"}>
                    Kỳ này: {cycleCount} lần
                    {cycleCount > 0 ? ` · phí ${formatMoney(cycleFee ?? 0)}` : ""}
                </span>
            ) : null}
        </div>
    );
}
