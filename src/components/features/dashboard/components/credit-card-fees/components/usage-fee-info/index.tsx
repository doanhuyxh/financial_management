import { Tag } from "antd";
import type { IUsageFeeStatus } from "@/components/features/dashboard/utils";
import { formatMoney } from "@/libs/utils/formatMoney";

/** Phí sử dụng theo kỳ: chỉ thu khi kỳ sao kê có chi tiêu. */
export default function UsageFeeInfo({ status }: { status: IUsageFeeStatus | null }) {
    if (!status) return <span className="text-muted-foreground">—</span>;
    return (
        <div className="flex flex-col gap-1">
            <span>~{formatMoney(status.fee)}/kỳ có chi tiêu</span>
            {status.transactions != null ? (
                <span className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                    Kỳ này {status.transactions} giao dịch
                    <Tag color={status.charged ? "orange" : "green"} className="m-0">
                        {status.charged ? "Đã phát sinh phí" : "Chưa mất phí"}
                    </Tag>
                </span>
            ) : null}
        </div>
    );
}
