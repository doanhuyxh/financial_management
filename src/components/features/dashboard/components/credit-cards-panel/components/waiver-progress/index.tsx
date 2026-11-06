import { Progress } from "@/components/shadcn/ui/progress";
import type { IFeeWaiverProgress } from "@/components/features/dashboard/utils";
import { cn } from "@/libs/shadcn/utils";

// Đỏ: còn xa mức miễn phí, vàng: đã quá nửa, xanh: đạt
const BAR_CLASS = {
    low: "*:data-[slot=progress-indicator]:bg-debt",
    mid: "*:data-[slot=progress-indicator]:bg-warn",
    done: "*:data-[slot=progress-indicator]:bg-money-in",
};
const TEXT_CLASS = { low: "text-debt", mid: "text-warn", done: "text-money-in" };

/** Thanh tiến độ của một điều kiện miễn phí (chi tiêu hoặc số giao dịch). */
export default function WaiverProgress({
    waiver,
    label,
    format,
}: {
    waiver: IFeeWaiverProgress | null;
    label: string;
    format: (value: number) => string;
}) {
    if (!waiver) return <span className="text-muted-foreground">—</span>;
    const percent = Math.min(100, Math.round((waiver.current / waiver.target) * 100));
    const level = waiver.achieved ? "done" : percent >= 50 ? "mid" : "low";
    return (
        <div className="min-w-44">
            <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-muted-foreground">{label}</span>
                <span className={cn("font-semibold tabular-nums", TEXT_CLASS[level])}>
                    {waiver.achieved ? "Đạt" : `${percent}%`}
                </span>
            </div>
            <Progress
                value={percent}
                aria-label={label}
                className={cn("my-1 h-1.5", BAR_CLASS[level])}
            />
            <span className="text-xs text-muted-foreground">
                {format(waiver.current)} / {format(waiver.target)}
            </span>
            {!waiver.achieved ? (
                <span
                    className={cn(
                        "block text-xs font-medium",
                        level === "low" ? "text-debt" : "text-warn",
                    )}
                >
                    Còn thiếu {format(waiver.target - waiver.current)}
                </span>
            ) : null}
        </div>
    );
}
