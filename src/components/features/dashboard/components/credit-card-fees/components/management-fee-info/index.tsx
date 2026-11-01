import type { ICreditCardFeeItem } from "@/components/features/dashboard/utils";
import { cn } from "@/libs/shadcn/utils";
import { formatMoney } from "@/libs/utils/formatMoney";

/** Phí quản lý ước tính mỗi tháng và ngày thu. */
export default function ManagementFeeInfo({ item }: { item: ICreditCardFeeItem }) {
    if (item.managementFee == null) return <span className="text-muted-foreground">—</span>;
    const waived = item.managementFee === 0 || Boolean(item.managementFeeWaiver?.achieved);
    return (
        <div className="flex flex-col gap-1">
            <span
                className={cn("font-semibold", waived ? "text-green-500 line-through" : "text-red-500")}
            >
                ≈{formatMoney(item.managementFee)}/tháng
            </span>
            {item.managementFeeDay ? (
                <span className="text-xs text-muted-foreground">
                    Thu ngày {item.managementFeeDay} hằng tháng
                </span>
            ) : null}
        </div>
    );
}
