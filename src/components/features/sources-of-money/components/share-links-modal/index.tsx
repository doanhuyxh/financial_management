"use client";

import { useId, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { CircleCheck, Copy, Link2Off, X } from "lucide-react";
import Combobox from "@/components/common/combobox";
import DayRangeFilter, { type DayRange } from "@/components/common/day-range-filter";
import EmptyState from "@/components/common/empty-state";
import FormField from "@/components/common/form-field";
import LoadingOverlay from "@/components/common/loading-overlay";
import ResponsiveModal from "@/components/common/responsive-modal";
import Tag from "@/components/common/tag";
import { Alert, AlertDescription, AlertTitle } from "@/components/shadcn/ui/alert";
import { Button } from "@/components/shadcn/ui/button";
import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupInput,
} from "@/components/shadcn/ui/input-group";
import { Spinner } from "@/components/shadcn/ui/spinner";
import { useSourcesOfMoneyContext } from "@/components/features/sources-of-money/context";
import { useCommon } from "@/libs/hooks/useCommon";
import type { SelectOption } from "@/libs/interfaces/selectOption";
import {
    DEFAULT_SHARE_LINK_EXPIRY_DAYS,
    SHARE_LINK_EXPIRY_OPTIONS,
    buildShareUrl,
    type IShareLinkData,
} from "@/libs/interfaces/shareLinksData";

const NEVER = "never";

// Ô chọn không nhận value null nên "không hạn" dùng chuỗi riêng
const EXPIRY_SELECT_OPTIONS: SelectOption[] = SHARE_LINK_EXPIRY_OPTIONS.map((option) => ({
    value: option.value === null ? NEVER : String(option.value),
    label: option.label,
}));

type FormValues = { label: string; expiry: string };

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
                    {link.isExpired ? <Tag color="default">Hết hạn</Tag> : null}
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
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                aria-label="Thu hồi link"
                title="Thu hồi link"
                onClick={() => onRevoke(link)}
            >
                <Link2Off className="size-4" />
            </Button>
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
    const { copiedToClipboard } = useCommon();
    const labelId = useId();
    const { control, handleSubmit, reset } = useForm<FormValues>({
        defaultValues: { label: "", expiry: String(DEFAULT_SHARE_LINK_EXPIRY_DAYS) },
    });
    const [range, setRange] = useState<DayRange>({});

    const handleClose = () => {
        reset();
        setRange({});
        closeShareModal();
    };

    const onValid = async (values: FormValues) => {
        await handleCreateShareLink({
            label: values.label.trim() || undefined,
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
                <Alert className="mb-4 border-money-in/30 bg-money-in-soft text-money-in">
                    <CircleCheck />
                    <AlertTitle className="text-foreground">
                        Đã tạo link. Hãy sao chép ngay: link chỉ hiện một lần.
                    </AlertTitle>
                    <AlertDescription>
                        <div className="flex w-full items-start gap-2">
                            <p className="min-w-0 flex-1 text-foreground break-all">{createdUrl}</p>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label="Sao chép link"
                                title="Sao chép link"
                                onClick={() => copiedToClipboard(createdUrl)}
                            >
                                <Copy className="size-4" />
                            </Button>
                        </div>
                    </AlertDescription>
                </Alert>
            ) : null}

            <form className="flex flex-col gap-4" noValidate onSubmit={handleSubmit(onValid)}>
                <Controller
                    name="label"
                    control={control}
                    rules={{ maxLength: { value: 100, message: "Tên link tối đa 100 ký tự" } }}
                    render={({ field, fieldState }) => (
                        <FormField
                            label="Tên link (để bạn tự nhận biết)"
                            error={fieldState.error?.message}
                            htmlFor={labelId}
                        >
                            <InputGroup>
                                <InputGroupInput
                                    {...field}
                                    id={labelId}
                                    aria-invalid={fieldState.invalid || undefined}
                                    placeholder="Ví dụ: Gửi kế toán"
                                />
                                {field.value ? (
                                    <InputGroupAddon align="inline-end">
                                        <InputGroupButton
                                            size="icon-xs"
                                            aria-label="Xóa tên link"
                                            onClick={() => field.onChange("")}
                                        >
                                            <X />
                                        </InputGroupButton>
                                    </InputGroupAddon>
                                ) : null}
                            </InputGroup>
                        </FormField>
                    )}
                />
                <Controller
                    name="expiry"
                    control={control}
                    render={({ field }) => (
                        <FormField label="Hạn dùng">
                            <Combobox
                                options={EXPIRY_SELECT_OPTIONS}
                                value={field.value}
                                onChange={(value) => {
                                    if (value) field.onChange(value);
                                }}
                            />
                        </FormField>
                    )}
                />
                <FormField label="Giới hạn khoảng ngày (tùy chọn)">
                    <DayRangeFilter value={range} onChange={setRange} />
                </FormField>
                <Button type="submit" className="w-full" disabled={isCreatingShareLink}>
                    {isCreatingShareLink ? <Spinner data-icon="inline-start" /> : null}
                    Tạo link
                </Button>
            </form>

            <h4 className="mt-5 mb-2 text-sm font-semibold">Link đang hoạt động</h4>
            <LoadingOverlay loading={isShareLinksLoading}>
                {shareLinks.length === 0 ? (
                    <EmptyState description="Chưa có link nào" />
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
            </LoadingOverlay>
        </ResponsiveModal>
    );
}
