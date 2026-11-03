"use client";

import { useEffect, useMemo } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, Input, Select, Skeleton } from "antd";
import dayjs from "dayjs";
import { Trash2, TriangleAlert } from "lucide-react";
import ResponsiveModal, { MODAL_AUTOFOCUS_CLASS } from "@/components/common/responsive-modal";
import AmountInput from "@/components/common/amount-input";
import DebouncedNumberInput from "@/components/common/input/DebouncedNumberInput";
import QuickDateField from "@/components/common/quick-date-field";
import Money from "@/components/common/money";
import { Alert, AlertDescription, AlertTitle } from "@/components/shadcn/ui/alert";
import { Button } from "@/components/shadcn/ui/button";
import { useDashboardContext } from "@/components/features/dashboard/context";
import {
    CardRolloverSchema,
    type CardRolloverFormInput,
    type CardRolloverFormValues,
} from "@/components/features/dashboard/schemas/card-rollover-schema";
import { useGetCategories } from "@/libs/hooks/customHooks/useCategories";
import { useSubmitShortcut } from "@/libs/hooks/useHotkey";
import { CategoryKind } from "@/libs/interfaces/categoriesData";
import type { ICardRolloverData } from "@/libs/interfaces/cardRolloversData";
import { filterCategoriesByKind } from "@/libs/utils/categoryKind";
import { calcPercentFee, estimateInterest } from "@/libs/utils/cardFee";
import { formatDate } from "@/libs/utils/formatDate";
import { formatMoney } from "@/libs/utils/formatMoney";

const toNumber = (value: unknown) => {
    if (value === undefined || value === null || value === "") return 0;
    const num = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
    return Number.isFinite(num) ? num : 0;
};

function RecentRollovers({
    items,
    loading,
    onDelete,
}: {
    items: ICardRolloverData[];
    loading: boolean;
    onDelete: (item: ICardRolloverData) => void;
}) {
    if (loading) return <Skeleton active paragraph={{ rows: 2 }} title={false} />;
    if (items.length === 0) {
        return <p className="text-xs text-muted-foreground">Thẻ này chưa ghi lần đáo hạn nào.</p>;
    }
    return (
        <ul className="divide-y divide-border rounded-lg border border-border">
            {items.map((item) => (
                <li key={item._id} className="flex items-center gap-3 px-3 py-2">
                    <div className="min-w-0 flex-1">
                        <p className="text-sm">
                            <span className="tabular-nums">{formatDate(item.rolledAt)}</span>
                            {" · đáo "}
                            <Money value={item.amount} kind="neutral" className="font-medium" />
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                            Phí <Money value={item.feeAmount} kind="out" />
                            {item.feePercent ? ` (${item.feePercent}%)` : ""}
                            {item.provider ? ` · ${item.provider}` : ""}
                            {item.note ? ` · ${item.note}` : ""}
                        </p>
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Xóa lần đáo hạn"
                        onClick={() => onDelete(item)}
                    >
                        <Trash2 className="text-debt" />
                    </Button>
                </li>
            ))}
        </ul>
    );
}

/**
 * Ghi một lần dùng dịch vụ đáo hạn thẻ: bên dịch vụ ứng tiền trả sao kê rồi quẹt lại,
 * nên dư nợ chỉ tăng đúng phí. Form điền sẵn dư nợ hiện tại và % phí cấu hình trên thẻ.
 */
export default function CardRolloverModal() {
    const {
        rolloverCard: card,
        closeRollover,
        handleRolloverSubmit,
        isRolloverSubmitting,
        rolloverItems,
        isRolloverLoading,
        handleDeleteRollover,
    } = useDashboardContext();
    const open = Boolean(card);

    const { data: categoriesData, isLoading: categoriesLoading } = useGetCategories({
        page: 1,
        limit: 100,
    });
    const categoryOptions = useMemo(
        () =>
            filterCategoriesByKind(categoriesData?.data?.items ?? [], CategoryKind.EXPENSE).map(
                (item) => ({ value: item._id, label: item.name }),
            ),
        [categoriesData],
    );

    const defaultPercent = card?.fee?.rollover?.feePercent ?? 0;
    const interestRate = card?.fee?.latePenalty?.interestRate ?? null;

    const {
        control,
        handleSubmit,
        reset,
        setValue,
        formState: { errors },
    } = useForm<CardRolloverFormInput, unknown, CardRolloverFormValues>({
        mode: "onTouched",
        resolver: zodResolver(CardRolloverSchema),
        defaultValues: {
            amount: "",
            feePercent: 0,
            feeAmount: 0,
            feeCategoryId: undefined,
            rolledAt: dayjs(),
            provider: "",
            note: "",
        },
    });

    // Mở modal: điền dư nợ hiện tại và % phí của thẻ
    useEffect(() => {
        if (!card) return;
        reset({
            amount: card.currentDebt > 0 ? String(Math.round(card.currentDebt)) : "",
            feePercent: defaultPercent,
            feeAmount: calcPercentFee(card.currentDebt, defaultPercent),
            feeCategoryId: undefined,
            rolledAt: dayjs(),
            provider: "",
            note: "",
        });
    }, [card?._id]);

    const amountWatch = useWatch({ control, name: "amount" });
    const feePercentWatch = useWatch({ control, name: "feePercent" });
    const feeAmountWatch = useWatch({ control, name: "feeAmount" });
    const amount = toNumber(amountWatch);
    const feePercent = toNumber(feePercentWatch);
    const feeAmount = toNumber(feeAmountWatch);

    // Đổi số tiền hoặc % thì tính lại phí; người dùng vẫn sửa được phí thực tế sau đó
    useEffect(() => {
        setValue("feeAmount", calcPercentFee(amount, feePercent));
    }, [amount, feePercent, setValue]);

    const interest = interestRate != null && amount > 0 ? estimateInterest(amount, interestRate) : null;

    const submit = handleSubmit(async (values) => {
        if (!card) return;
        await handleRolloverSubmit({
            sourceOfMoneyId: card._id,
            amount: values.amount,
            feePercent: values.feePercent,
            feeAmount: values.feeAmount,
            feeCategoryId: values.feeAmount > 0 ? values.feeCategoryId : undefined,
            provider: values.provider?.trim() || "",
            note: values.note?.trim() || "",
            rolledAt: values.rolledAt.toISOString(),
        });
    });

    useSubmitShortcut(submit, open);

    if (!card) return null;

    return (
        <ResponsiveModal
            title={`Đáo hạn thẻ: ${card.name}`}
            open={open}
            onCancel={closeRollover}
            onOk={submit}
            confirmLoading={isRolloverSubmitting}
            okText="Ghi đáo hạn"
            cancelText="Hủy"
            destroyOnHidden
            width={600}
        >
            <div className="mt-2 flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                    <div className="rounded-md border border-border px-3 py-2">
                        <p className="text-xs text-muted-foreground">Dư nợ hiện tại</p>
                        <Money value={card.currentDebt} kind="debt" className="font-semibold" />
                    </div>
                    <div className="rounded-md border border-border px-3 py-2">
                        <p className="text-xs text-muted-foreground">Hạn mức còn lại</p>
                        <Money value={card.availableCredit} kind="credit" className="font-semibold" />
                    </div>
                    <div className="col-span-2 rounded-md border border-border px-3 py-2 sm:col-span-1">
                        <p className="text-xs text-muted-foreground">Hạn trả kế tiếp</p>
                        <p className="font-semibold tabular-nums">
                            {card.nextDueDate
                                ? `${card.nextDueDate.format("DD/MM")}${
                                      card.daysLeft != null ? ` · còn ${card.daysLeft} ngày` : ""
                                  }`
                                : "Chưa đặt"}
                        </p>
                    </div>
                </div>

                <Alert variant="destructive">
                    <TriangleAlert />
                    <AlertTitle>Đáo hạn không làm giảm nợ</AlertTitle>
                    <AlertDescription>
                        Bên dịch vụ trả sao kê giúp bạn rồi quẹt lại thẻ bằng giao dịch mua hàng
                        giả. Dư nợ giữ nguyên, bạn mất thêm phí mỗi lần và ngân hàng có thể khóa thẻ
                        nếu phát hiện. App chỉ ghi lại để theo dõi chi phí.
                    </AlertDescription>
                </Alert>

                <Form layout="vertical" requiredMark={false} onFinish={submit}>
                    <Form.Item
                        label="Số tiền được ứng để trả sao kê"
                        className={MODAL_AUTOFOCUS_CLASS}
                        validateStatus={errors.amount ? "error" : undefined}
                        help={errors.amount?.message}
                        extra={`Tối đa bằng dư nợ đang nợ: ${formatMoney(card.currentDebt)}`}
                    >
                        <Controller
                            name="amount"
                            control={control}
                            render={({ field }) => (
                                <AmountInput value={field.value} onChange={field.onChange} />
                            )}
                        />
                    </Form.Item>

                    <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-4">
                        <Form.Item
                            label="% phí dịch vụ"
                            validateStatus={errors.feePercent ? "error" : undefined}
                            help={errors.feePercent?.message}
                            extra={
                                defaultPercent
                                    ? `Theo cấu hình thẻ: ${defaultPercent}%`
                                    : "Nhập % để app tự tính phí; có thể sửa phí bên cạnh"
                            }
                        >
                            <Controller
                                name="feePercent"
                                control={control}
                                render={({ field }) => (
                                    <DebouncedNumberInput
                                        className="w-full!"
                                        min={0}
                                        max={100}
                                        step={0.1}
                                        delay={300}
                                        placeholder="0"
                                        value={field.value}
                                        onChange={field.onChange}
                                    />
                                )}
                            />
                        </Form.Item>
                        <Form.Item
                            label="Phí thực tế"
                            validateStatus={errors.feeAmount ? "error" : undefined}
                            help={errors.feeAmount?.message}
                            extra="Dư nợ thẻ sẽ tăng đúng số này"
                        >
                            <Controller
                                name="feeAmount"
                                control={control}
                                render={({ field }) => (
                                    <DebouncedNumberInput
                                        className="w-full!"
                                        min={0}
                                        step={10000}
                                        delay={300}
                                        placeholder="0"
                                        value={field.value}
                                        onChange={field.onChange}
                                    />
                                )}
                            />
                        </Form.Item>
                    </div>

                    {amount > 0 ? (
                        <p className="mb-4 text-xs text-muted-foreground">
                            Đáo hạn lần này tốn{" "}
                            <Money value={feeAmount} kind="out" className="font-semibold" />
                            {interest != null ? (
                                <>
                                    {" "}
                                    · nếu không trả hết, lãi {interestRate}%/năm ≈{" "}
                                    <Money value={interest} kind="out" className="font-semibold" />
                                    /30 ngày
                                    {feeAmount > interest
                                        ? ". Phí đáo hạn đang cao hơn lãi."
                                        : "."}
                                </>
                            ) : null}
                        </p>
                    ) : null}

                    <Form.Item
                        label="Danh mục chi tiêu phí"
                        validateStatus={errors.feeCategoryId ? "error" : undefined}
                        help={errors.feeCategoryId?.message}
                        extra={feeAmount > 0 ? "Phí được ghi thành một khoản chi tiêu trên thẻ" : "Chỉ bắt buộc khi phí > 0"}
                    >
                        <Controller
                            name="feeCategoryId"
                            control={control}
                            render={({ field }) => (
                                <Select
                                    showSearch
                                    allowClear
                                    optionFilterProp="label"
                                    placeholder="Chọn danh mục"
                                    loading={categoriesLoading}
                                    options={categoryOptions}
                                    value={field.value}
                                    onChange={(value) => field.onChange(value ?? undefined)}
                                />
                            )}
                        />
                    </Form.Item>

                    <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-4">
                        <Form.Item
                            label="Ngày đáo hạn"
                            validateStatus={errors.rolledAt ? "error" : undefined}
                            help={errors.rolledAt?.message as string | undefined}
                        >
                            <Controller
                                name="rolledAt"
                                control={control}
                                render={({ field }) => (
                                    <QuickDateField value={field.value} onChange={field.onChange} />
                                )}
                            />
                        </Form.Item>
                        <Form.Item
                            label="Bên dịch vụ"
                            validateStatus={errors.provider ? "error" : undefined}
                            help={errors.provider?.message}
                        >
                            <Controller
                                name="provider"
                                control={control}
                                render={({ field }) => (
                                    <Input {...field} maxLength={100} placeholder="Tên dịch vụ (không bắt buộc)" />
                                )}
                            />
                        </Form.Item>
                    </div>

                    <Form.Item
                        label="Ghi chú"
                        className="mb-0"
                        validateStatus={errors.note ? "error" : undefined}
                        help={errors.note?.message}
                    >
                        <Controller
                            name="note"
                            control={control}
                            render={({ field }) => (
                                <Input.TextArea
                                    {...field}
                                    rows={2}
                                    maxLength={500}
                                    placeholder="Ghi chú (không bắt buộc)"
                                    showCount
                                />
                            )}
                        />
                    </Form.Item>
                </Form>

                <div>
                    <p className="mb-2 text-xs font-medium text-muted-foreground">
                        Lần đáo hạn gần đây của thẻ
                    </p>
                    <RecentRollovers
                        items={rolloverItems}
                        loading={isRolloverLoading}
                        onDelete={handleDeleteRollover}
                    />
                </div>
            </div>
        </ResponsiveModal>
    );
}
