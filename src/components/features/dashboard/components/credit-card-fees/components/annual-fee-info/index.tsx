import { Tag } from "antd";
import type { ICreditCardFeeItem } from "@/components/features/dashboard/utils";
import { cn } from "@/libs/shadcn/utils";
import { formatMoney } from "@/libs/utils/formatMoney";

const STATUS_COLORS: Record<NonNullable<ICreditCardFeeItem["status"]>, string> = {
    today: "red",
    urgent: "red",
    soon: "orange",
    normal: "default",
};

/** Phí thường niên ước tính và ngày thu kế tiếp. */
export default function AnnualFeeInfo({ item }: { item: ICreditCardFeeItem }) {
    if (item.annualFee == null && !item.nextAnnualFeeDate) {
        return <span className="text-muted-foreground">—</span>;
    }
    // Đạt điều kiện miễn phí (hoặc phí = 0) thì xanh, còn lại là phí sẽ bị thu
    const waived = item.annualFee === 0 || Boolean(item.annualFeeWaiver?.achieved);
    return (
        <div className="flex flex-col gap-1">
            {item.annualFee != null ? (
                <span
                    className={cn(
                        "font-semibold",
                        waived ? "text-green-500 line-through" : "text-red-500",
                    )}
                >
                    ≈{formatMoney(item.annualFee)}
                </span>
            ) : (
                <span className="text-muted-foreground">Chưa nhập phí</span>
            )}
            {item.nextAnnualFeeDate && item.status ? (
                <span className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                    {item.nextAnnualFeeDate.format("DD/MM/YYYY")}
                    <Tag
                        color={STATUS_COLORS[item.status]}
                        variant={item.status === "normal" ? "filled" : "solid"}
                        className="m-0"
                    >
                        {item.status === "today" ? "Thu hôm nay" : `Còn ${item.daysLeft} ngày`}
                    </Tag>
                </span>
            ) : null}
        </div>
    );
}
