import Link from "next/link";
import type { IRolloverStatus } from "@/components/features/dashboard/utils";
import { MENU_KEY } from "@/libs/constants/menuKey";
import { formatMoney } from "@/libs/utils/formatMoney";

/** Phí đáo hạn ước tính trên dư nợ hiện tại, so với lãi nếu không trả hết, và số lần đã đáo trong kỳ. */
export default function RolloverInfo({ status, cardId }: { status: IRolloverStatus | null; cardId: string }) {
    if (!status) return <span className="text-muted-foreground">—</span>;
    const { feePercent, estimatedFee, estimatedMonthlyInterest, cycleCount, cycleFee, journey } = status;
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
            {journey ? (
                <span className="rounded-r-md border-l-2 border-primary bg-primary-soft px-2 py-1 text-xs">
                    Đã mất {Math.round(journey.feeRatio * 100)}% gốc sau {journey.rolloverCount} lần
                    {journey.remainingToBreakEven != null ? ` · hòa gốc sau ~${journey.remainingToBreakEven} lần nữa` : ""}
                    {" · "}
                    <Link href={`${MENU_KEY.ROLLOVER_JOURNEY}?cardId=${cardId}`} className="text-accent-text underline">
                        Hành trình
                    </Link>
                </span>
            ) : null}
        </div>
    );
}
