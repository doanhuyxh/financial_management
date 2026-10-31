import type { ICreditCardFeeItem } from "@/components/features/dashboard/utils";
import { formatMoney } from "@/libs/utils/formatMoney";

/** Phí quản lý ước tính mỗi tháng và ngày thu. */
export default function ManagementFeeInfo({ item }: { item: ICreditCardFeeItem }) {
    if (item.managementFee == null) return <span className="text-muted-foreground">—</span>;
    return (
        <div className="flex flex-col gap-1">
            <span>~{formatMoney(item.managementFee)}/tháng</span>
            {item.managementFeeDay ? (
                <span className="text-xs text-muted-foreground">
                    Thu ngày {item.managementFeeDay} hằng tháng
                </span>
            ) : null}
        </div>
    );
}
