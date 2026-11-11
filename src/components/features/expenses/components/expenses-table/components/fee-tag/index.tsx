import Tag from "@/components/common/tag";
import {
    CARD_FEE_TYPE_LABELS,
    CardFeeType,
    type IExpensesData,
} from "@/libs/interfaces/expensesData";

/**
 * Đánh dấu khoản chi là phí: phí chuyển tiền / phí đáo hạn (bị khóa sửa/xóa) hoặc phí thẻ
 * (không tính vào điều kiện miễn phí của thẻ).
 */
export default function FeeTag({ record }: { record: IExpensesData }) {
    if (record.skipBalanceAdjust) {
        return (
            <Tag color="orange">
                {record.cardFeeType === CardFeeType.ROLLOVER_FEE ? "Phí đáo hạn" : "Phí chuyển tiền"}
            </Tag>
        );
    }
    if (record.cardFeeType) {
        return <Tag color="purple">{CARD_FEE_TYPE_LABELS[record.cardFeeType]}</Tag>;
    }
    return null;
}
