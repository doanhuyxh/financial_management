import { Tag } from "antd";

/** Đánh dấu khoản chi là phí chuyển tiền (bị khóa sửa/xóa). */
export default function FeeTag() {
    return (
        <Tag color="orange" className="w-fit">
            Phí chuyển tiền
        </Tag>
    );
}
