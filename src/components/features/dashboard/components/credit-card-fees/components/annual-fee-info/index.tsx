import { Tag } from "antd";
import type { ICreditCardFeeItem } from "@/components/features/dashboard/utils";
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
    return (
        <div className="flex flex-col gap-1">
            <span>{item.annualFee != null ? `~${formatMoney(item.annualFee)}` : "Chưa nhập phí"}</span>
            {item.nextAnnualFeeDate && item.status ? (
                <span className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                    {item.nextAnnualFeeDate.format("DD/MM/YYYY")}
                    <Tag color={STATUS_COLORS[item.status]} className="m-0">
                        {item.status === "today" ? "Thu hôm nay" : `Còn ${item.daysLeft} ngày`}
                    </Tag>
                </span>
            ) : null}
        </div>
    );
}
