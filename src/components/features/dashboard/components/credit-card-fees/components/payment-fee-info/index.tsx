import { Tag } from "antd";
import type { IPaymentFeeStatus } from "@/components/features/dashboard/utils";
import { formatMoney } from "@/libs/utils/formatMoney";

/** Phí trả nợ thẻ: số lần đã trả trong kỳ sao kê và phí ước tính đã phát sinh. */
export default function PaymentFeeInfo({ status }: { status: IPaymentFeeStatus | null }) {
    if (!status) return <span className="text-muted-foreground">—</span>;
    return (
        <div className="flex flex-col gap-1">
            <span>
                ~{formatMoney(status.fee)}/lần
                {status.freePayments > 0 ? ` từ lần ${status.freePayments + 1}` : ""}
            </span>
            {status.payments != null ? (
                <span className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                    Kỳ này đã trả {status.payments} lần
                    {status.estimatedTotal > 0 ? (
                        <Tag color="orange" className="m-0">
                            Phí ~{formatMoney(status.estimatedTotal)}
                        </Tag>
                    ) : (
                        <Tag color={status.nextPaymentCharged ? "orange" : "green"} className="m-0">
                            {status.nextPaymentCharged ? "Lần tới mất phí" : "Lần tới miễn phí"}
                        </Tag>
                    )}
                </span>
            ) : null}
        </div>
    );
}
