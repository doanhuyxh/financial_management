"use client";

import { Button, Dropdown } from "antd";
import { ChevronDown, Receipt } from "lucide-react";
import { useDashboardContext } from "@/components/features/dashboard/context";
import type { ICreditCardFeeItem } from "@/components/features/dashboard/utils";
import { CardFeeType } from "@/libs/interfaces/expensesData";

/**
 * Nút "Ghi phí": mở form chi tiêu điền sẵn khoản phí thẻ (số ước tính, người dùng sửa số thực tế).
 * Chỉ liệt kê loại phí áp dụng cho thẻ.
 */
export default function RecordFeeButton({ item }: { item: ICreditCardFeeItem }) {
    const { handleRecordCardFee } = useDashboardContext();
    const { latePenalty } = item;
    const actions = [
        {
            type: CardFeeType.ANNUAL_FEE,
            label: "Phí thường niên",
            visible: item.annualFee != null || Boolean(item.nextAnnualFeeDate),
        },
        {
            type: CardFeeType.MANAGEMENT_FEE,
            label: "Phí quản lý",
            visible: item.managementFee != null,
        },
        {
            type: CardFeeType.PAYMENT_FEE,
            label: "Phí thanh toán",
            visible: Boolean(item.paymentFee && item.paymentFee.estimatedTotal > 0),
        },
        {
            type: CardFeeType.USAGE_FEE,
            label: "Phí sử dụng",
            visible: Boolean(item.usageFee?.charged),
        },
        {
            type: CardFeeType.INTEREST,
            label: "Lãi",
            visible: latePenalty?.interestRate != null,
        },
        {
            type: CardFeeType.LATE_FEE,
            label: "Phí chậm trả",
            visible: Boolean(
                latePenalty &&
                (latePenalty.lateFeePercentPerDay != null || latePenalty.lateFeeMin != null),
            ),
        },
    ].filter((action) => action.visible);

    if (actions.length === 0) return null;

    return (
        <Dropdown
            trigger={["click"]}
            placement="bottomRight"
            menu={{
                items: actions.map((action) => ({ key: action.type, label: action.label })),
                onClick: ({ key }) => handleRecordCardFee(item, key as CardFeeType),
            }}
        >
            <Button size="small" icon={<Receipt className="size-4" />}>
                Ghi phí <ChevronDown className="size-3.5" />
            </Button>
        </Dropdown>
    );
}
