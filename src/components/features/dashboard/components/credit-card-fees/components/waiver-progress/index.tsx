import { Progress, Tag } from "antd";
import type { IFeeWaiverProgress } from "@/components/features/dashboard/utils";

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
    return (
        <div className="min-w-44">
            <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-muted-foreground">{label}</span>
                {waiver.achieved ? (
                    <Tag color="green" className="m-0">
                        Đạt
                    </Tag>
                ) : null}
            </div>
            <Progress
                percent={percent}
                size="small"
                showInfo={false}
                status={waiver.achieved ? "success" : "normal"}
            />
            <span className="text-xs text-muted-foreground">
                {format(waiver.current)} / {format(waiver.target)}
            </span>
        </div>
    );
}
