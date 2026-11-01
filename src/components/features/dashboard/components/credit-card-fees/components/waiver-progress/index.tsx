import { Progress, Tag } from "antd";
import type { IFeeWaiverProgress } from "@/components/features/dashboard/utils";
import { cn } from "@/libs/shadcn/utils";

// Đỏ: còn xa mức miễn phí, vàng: đã quá nửa, xanh: đạt
const STROKE_COLORS = { low: "#ef4444", mid: "#f59e0b", done: "#22c55e" };

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
                <Tag color={waiver.achieved ? "green" : "red"} variant="solid" className="m-0">
                    {waiver.achieved ? "Đạt" : `${percent}%`}
                </Tag>
            </div>
            <Progress
                percent={percent}
                size="small"
                showInfo={false}
                strokeColor={STROKE_COLORS[level]}
                railColor="rgba(148, 163, 184, 0.35)"
            />
            <span className="text-xs text-muted-foreground">
                {format(waiver.current)} / {format(waiver.target)}
            </span>
            {!waiver.achieved ? (
                <span
                    className={cn(
                        "block text-xs font-medium",
                        level === "low" ? "text-red-500" : "text-amber-500",
                    )}
                >
                    Còn thiếu {format(waiver.target - waiver.current)}
                </span>
            ) : null}
        </div>
    );
}
