"use client";

import { useState } from "react";
import { Alert, Button, Empty, Form, Input, Select, Spin, Tag, Typography } from "antd";
import { Link2Off } from "lucide-react";
import DayRangeFilter, { type DayRange } from "@/components/common/day-range-filter";
import ResponsiveModal from "@/components/common/responsive-modal";
import { useSourcesOfMoneyContext } from "@/components/features/sources-of-money/context";
import {
    DEFAULT_SHARE_LINK_EXPIRY_DAYS,
    SHARE_LINK_EXPIRY_OPTIONS,
    buildShareUrl,
    type IShareLinkData,
} from "@/libs/interfaces/shareLinksData";

const NEVER = "never";

// Select không nhận value null nên "không hạn" dùng chuỗi riêng
const EXPIRY_SELECT_OPTIONS = SHARE_LINK_EXPIRY_OPTIONS.map((option) => ({
    value: option.value === null ? NEVER : String(option.value),
    label: option.label,
}));

type FormValues = { label?: string; expiry: string };

function formatDay(value?: string | null) {
    if (!value) return "…";
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
}

function formatDateTime(value?: string | null) {
    return value
        ? new Date(value).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })
        : "—";
}

function ShareLinkItem({
    link,
    onRevoke,
}: {
    link: IShareLinkData;
    onRevoke: (link: IShareLinkData) => void;
}) {
    return (
        <div className="flex items-start justify-between gap-3 rounded-md border px-3 py-2">
            <div className="flex min-w-0 flex-col gap-0.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1 text-sm font-medium text-foreground">
                    <span className="truncate">{link.label || "Link không tên"}</span>
                    {link.isExpired ? (
                        <Tag className="m-0" color="default">
                            Hết hạn
                        </Tag>
                    ) : null}
                </span>
                <span>Tạo lúc {formatDateTime(link.createdAt)}</span>
                <span>
                    {link.expiresAt ? `Hết hạn ${formatDateTime(link.expiresAt)}` : "Không hạn"}
                </span>
                {link.from || link.to ? (
                    <span>
                        Chỉ xem từ {formatDay(link.from)} đến {formatDay(link.to)}
                    </span>
                ) : null}
                <span>{link.viewCount} lượt xem</span>
            </div>
            <Button
                type="text"
                size="small"
                danger
                aria-label="Thu hồi link"
                title="Thu hồi link"
                icon={<Link2Off className="size-4" />}
                onClick={() => onRevoke(link)}
            />
        </div>
    );
}

export default function ShareLinksModal() {
    const {
        historySource,
        shareModalOpen,
        shareLinks,
        isShareLinksLoading,
        isCreatingShareLink,
        createdShareLink,
        closeShareModal,
        handleCreateShareLink,
        handleRevokeShareLink,
    } = useSourcesOfMoneyContext();
    const [form] = Form.useForm<FormValues>();
    const [range, setRange] = useState<DayRange>({});

    const handleClose = () => {
        form.resetFields();
        setRange({});
        closeShareModal();
    };

    const handleFinish = async (values: FormValues) => {
        await handleCreateShareLink({
            label: values.label?.trim() || undefined,
            expiresInDays: values.expiry === NEVER ? null : (Number(values.expiry) as 7 | 30),
            from: range.from ?? null,
            to: range.to ?? null,
        });
    };

    const createdUrl =
        createdShareLink && typeof window !== "undefined"
            ? buildShareUrl(window.location.origin, createdShareLink.token)
            : null;

    return (
        <ResponsiveModal
            title={historySource ? `Chia sẻ lịch sử: ${historySource.name}` : "Chia sẻ lịch sử"}
            open={shareModalOpen && Boolean(historySource)}
            onCancel={handleClose}
            footer={null}
            destroyOnHidden
            width={560}
        >
            <p className="mb-3 text-xs text-muted-foreground">
                Ai có link đều xem được, không cần đăng nhập. Link chỉ hiện tên nguồn tiền, thời
                gian, số tiền và nội dung giao dịch; không có danh mục, số dư hay điều chỉnh tay.
            </p>

            {createdUrl ? (
                <Alert
                    className="mb-4"
                    type="success"
                    showIcon
                    title="Đã tạo link. Hãy sao chép ngay: link chỉ hiện một lần."
                    description={
                        <Typography.Paragraph
                            className="mb-0! break-all"
                            copyable={{ text: createdUrl }}
                        >
                            {createdUrl}
                        </Typography.Paragraph>
                    }
                />
            ) : null}

            <Form
                form={form}
                layout="vertical"
                initialValues={{ expiry: String(DEFAULT_SHARE_LINK_EXPIRY_DAYS) }}
                onFinish={handleFinish}
            >
                <Form.Item
                    name="label"
                    label="Tên link (để bạn tự nhận biết)"
                    rules={[{ max: 100, message: "Tên link tối đa 100 ký tự" }]}
                >
                    <Input placeholder="Ví dụ: Gửi kế toán" allowClear />
                </Form.Item>
                <Form.Item name="expiry" label="Hạn dùng">
                    <Select options={EXPIRY_SELECT_OPTIONS} />
                </Form.Item>
                <Form.Item label="Giới hạn khoảng ngày (tùy chọn)">
                    <DayRangeFilter value={range} onChange={setRange} />
                </Form.Item>
                <Button type="primary" htmlType="submit" block loading={isCreatingShareLink}>
                    Tạo link
                </Button>
            </Form>

            <h4 className="mt-5 mb-2 text-sm font-semibold">Link đang hoạt động</h4>
            <Spin spinning={isShareLinksLoading}>
                {shareLinks.length === 0 ? (
                    <Empty description="Chưa có link nào" />
                ) : (
                    <div className="flex flex-col gap-2">
                        {shareLinks.map((link) => (
                            <ShareLinkItem
                                key={link._id}
                                link={link}
                                onRevoke={handleRevokeShareLink}
                            />
                        ))}
                    </div>
                )}
            </Spin>
        </ResponsiveModal>
    );
}
