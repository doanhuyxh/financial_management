import type { ReactNode } from "react";
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
    footer,
}: {
    waiver: IFeeWaiverProgress | null;
    label: string;
    format: (value: number) => string;
    /** Thêm cặp `<dt>`/`<dd>` dưới "Còn thiếu" (VD nhịp chi mỗi tháng); chỉ hiện khi chưa đạt */
    footer?: ReactNode;
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
                <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
                    <dt className="text-muted-foreground">Còn thiếu</dt>
                    <dd className="money-value text-right font-semibold tabular-nums text-warn">
                        {format(waiver.target - waiver.current)}
                    </dd>
                    {footer}
                </dl>
            ) : null}
        </div>
    );
}
