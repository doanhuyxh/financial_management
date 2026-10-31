import { Tag } from "antd";
import { CARD_FEE_TYPE_LABELS, type IExpensesData } from "@/libs/interfaces/expensesData";

/**
 * Đánh dấu khoản chi là phí: phí chuyển tiền (bị khóa sửa/xóa) hoặc phí thẻ
 * (không tính vào điều kiện miễn phí của thẻ).
 */
export default function FeeTag({ record }: { record: IExpensesData }) {
    if (record.skipBalanceAdjust) {
        return (
            <Tag color="orange" className="w-fit">
                Phí chuyển tiền
            </Tag>
        );
    }
    if (record.cardFeeType) {
        return (
            <Tag color="purple" className="w-fit">
                {CARD_FEE_TYPE_LABELS[record.cardFeeType]}
            </Tag>
        );
    }
    return null;
}
