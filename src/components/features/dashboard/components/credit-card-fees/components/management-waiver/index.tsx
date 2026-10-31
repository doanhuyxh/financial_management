import type { IManagementFeeWaiver } from "@/components/features/dashboard/utils";
import WaiverProgress from "@/components/features/dashboard/components/credit-card-fees/components/waiver-progress";
import { formatMoney } from "@/libs/utils/formatMoney";

/** Miễn phí quản lý: đạt số giao dịch HOẶC mức chi tiêu trong kỳ sao kê. */
export default function ManagementWaiver({ waiver }: { waiver: IManagementFeeWaiver | null }) {
    if (!waiver) return <span className="text-muted-foreground">—</span>;
    return (
        <div className="flex flex-col gap-1">
            {waiver.transactions ? (
                <WaiverProgress
                    waiver={waiver.transactions}
                    label="Giao dịch kỳ này"
                    format={(value) => `${value} GD`}
                />
            ) : null}
            {waiver.transactions && waiver.spend ? (
                <span className="text-xs text-muted-foreground">hoặc</span>
            ) : null}
            {waiver.spend ? (
                <WaiverProgress waiver={waiver.spend} label="Chi tiêu kỳ này" format={formatMoney} />
            ) : null}
        </div>
    );
}
