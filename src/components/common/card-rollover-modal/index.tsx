"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, Input, Select, Skeleton } from "antd";
import dayjs from "dayjs";
import { Trash2, TriangleAlert } from "lucide-react";
import ResponsiveModal, { MODAL_AUTOFOCUS_CLASS } from "@/components/common/responsive-modal";
import AmountInput from "@/components/common/amount-input";
import ChoiceChips from "@/components/common/choice-chips";
import DebouncedNumberInput from "@/components/common/input/DebouncedNumberInput";
import QuickDateField from "@/components/common/quick-date-field";
import Money from "@/components/common/money";
import RolloverAnalysis from "@/components/common/rollover-analysis";
import { Alert, AlertDescription, AlertTitle } from "@/components/shadcn/ui/alert";
import { Button } from "@/components/shadcn/ui/button";
import { Checkbox } from "@/components/shadcn/ui/checkbox";
import { Label } from "@/components/shadcn/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/shadcn/ui/tabs";
import {
    CardRolloverSchema,
    type CardRolloverFormInput,
    type CardRolloverFormValues,
} from "@/components/common/card-rollover-modal/schema";
import { useGetCategories } from "@/libs/hooks/customHooks/useCategories";
import { useGetSourcesOfMoney } from "@/libs/hooks/customHooks/useSourcesOfMoney";
import { useSubmitShortcut } from "@/libs/hooks/useHotkey";
import { CategoryKind } from "@/libs/interfaces/categoriesData";
import type { ICardRolloverData, IFromCardRolloverData } from "@/libs/interfaces/cardRolloversData";
import { SourcesOfMoneyType, type ISourcesOfMoneyData } from "@/libs/interfaces/sourcesOfMoneyData";
import { filterCategoriesByKind } from "@/libs/utils/categoryKind";
import { calcPercentFee, estimateInterest } from "@/libs/utils/cardFee";
import { getNextDueDate } from "@/libs/utils/dueDate";
import { formatDate } from "@/libs/utils/formatDate";
import { formatMoney } from "@/libs/utils/formatMoney";

const toNumber = (value: unknown) => {
    if (value === undefined || value === null || value === "") return 0;
    const num = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
    return Number.isFinite(num) ? num : 0;
};

/** Cách nhập số tiền: A = số dịch vụ ứng, N = số quẹt lại đã gồm phí (A = n ÷ (1 + r)). */
type InputMode = "A" | "N";

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
            {items.map((item) => {
                const payment =
                    item.paymentTransferId && typeof item.paymentTransferId === "object"
                        ? item.paymentTransferId
                        : null;
                return (
                    <li key={item._id} className="flex items-center gap-3 px-3 py-2">
                        <div className="min-w-0 flex-1 text-xs">
                            <p className="text-sm">
                                <span className="tabular-nums">{formatDate(item.rolledAt)}</span>
                                {payment ? (
                                    <>
                                        {" · bạn trả "}
                                        <Money value={payment.amount} kind="in" className="font-medium" />
                                    </>
                                ) : null}
                                {" · ứng "}
                                <Money value={item.amount} className="font-medium" />
                                {" · quẹt lại "}
                                <Money value={item.amount + item.feeAmount} kind="debt" className="font-medium" />
                            </p>
                            <p className="truncate text-muted-foreground">
                                Phí <Money value={item.feeAmount} kind="out" />
                                {item.feePercent ? ` (${item.feePercent}%)` : ""}
                                {item.provider ? ` · ${item.provider}` : ""}
                                {item.note ? ` · ${item.note}` : ""}
                            </p>
                        </div>
                        <Button type="button" variant="ghost" size="icon-sm" aria-label="Xóa lần đáo hạn" onClick={() => onDelete(item)}>
                            <Trash2 className="text-debt" />
                        </Button>
                    </li>
                );
            })}
        </ul>
    );
}

export interface ICardRolloverModalProps {
    /** Thẻ đang mở (null = đóng); truyền bản mới nhất từ danh sách nguồn để dư nợ luôn đúng */
    source: ISourcesOfMoneyData | null;
    onClose: () => void;
    onSubmit: (values: IFromCardRolloverData) => Promise<boolean>;
    isSubmitting: boolean;
    /** Các lần đáo hạn gần đây của thẻ */
    items: ICardRolloverData[];
    isLoading: boolean;
    onDelete: (item: ICardRolloverData) => void;
    /** Mở sẵn tab Phân tích */
    defaultTab?: "form" | "analysis";
}

/**
 * Ghi một lần dùng dịch vụ đáo hạn thẻ (có thể kèm tự trả một phần x): dịch vụ ứng A trả sao kê
 * rồi quẹt lại n = A + phí, nên dư nợ chỉ tăng đúng phí. Tab "Phân tích" mô phỏng và so sánh.
 * State/handler lấy từ `useCardRollover` (`libs/hooks/useCardRollover.tsx`).
 */
export default function CardRolloverModal({
    source,
    onClose,
    onSubmit,
    isSubmitting,
    items,
    isLoading,
    onDelete,
    defaultTab = "form",
}: ICardRolloverModalProps) {
    const open = Boolean(source);
    const [tab, setTab] = useState<string>(defaultTab);
    const [inputMode, setInputMode] = useState<InputMode>("A");
    const [selfPay, setSelfPay] = useState(false);

    const card = useMemo(() => {
        if (!source) return null;
        const creditLimit = source.creditDetails?.creditLimit ?? 0;
        const currentDebt = source.creditDetails?.currentDebt ?? 0;
        const dueDay = source.creditDetails?.dueDate;
        const nextDueDate = dueDay ? getNextDueDate(dueDay) : null;
        return {
            _id: source._id,
            name: source.name,
            currentDebt,
            availableCredit: Math.max(0, creditLimit - currentDebt),
            nextDueDate,
            daysLeft: nextDueDate ? nextDueDate.diff(dayjs().startOf("day"), "day") : null,
            feePercent: source.creditDetails?.rolloverFeePercent ?? 0,
            interestRate: source.creditDetails?.interestRate ?? null,
        };
    }, [source]);

    const { data: categoriesData, isLoading: categoriesLoading } = useGetCategories({ page: 1, limit: 100 });
    const categoryOptions = useMemo(
        () =>
            filterCategoriesByKind(categoriesData?.data?.items ?? [], CategoryKind.EXPENSE).map((item) => ({
                value: item._id,
                label: item.name,
            })),
        [categoriesData],
    );
    const { data: sourcesData, isLoading: sourcesLoading } = useGetSourcesOfMoney({ page: 1, limit: 100 });
    const paySourceOptions = useMemo(
        () =>
            (sourcesData?.data?.items ?? [])
                .filter((item) => item.type !== SourcesOfMoneyType.CREDIT_CARD)
                .map((item) => ({ value: item._id, label: `${item.name} · ${formatMoney(item.balance ?? 0)}` })),
        [sourcesData],
    );

    const defaultPercent = card?.feePercent ?? 0;
    const interestRate = card?.interestRate ?? null;

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
            paymentAmount: 0,
            paymentSourceId: undefined,
            rolledAt: dayjs(),
            provider: "",
            note: "",
        },
    });

    // Mở modal: điền dư nợ hiện tại và % phí của thẻ, về tab mặc định
    useEffect(() => {
        if (!card) return;
        setTab(defaultTab);
        setInputMode("A");
        setSelfPay(false);
        reset({
            amount: card.currentDebt > 0 ? String(Math.round(card.currentDebt)) : "",
            feePercent: defaultPercent,
            feeAmount: calcPercentFee(card.currentDebt, defaultPercent),
            feeCategoryId: undefined,
            paymentAmount: 0,
            paymentSourceId: undefined,
            rolledAt: dayjs(),
            provider: "",
            note: "",
        });
    }, [card?._id]);

    const amountWatch = useWatch({ control, name: "amount" });
    const feePercentWatch = useWatch({ control, name: "feePercent" });
    const feeAmountWatch = useWatch({ control, name: "feeAmount" });
    const paymentWatch = useWatch({ control, name: "paymentAmount" });
    const entered = toNumber(amountWatch);
    const feePercent = toNumber(feePercentWatch);
    const feeAmount = toNumber(feeAmountWatch);
    const paymentAmount = selfPay ? toNumber(paymentWatch) : 0;
    const debt = card?.currentDebt ?? 0;

    // Phân rã x · A · n theo cách nhập đang chọn
    const advanced = inputMode === "A" ? entered : Math.max(0, entered - feeAmount);
    const swiped = advanced + feeAmount;

    // Đổi số tiền hoặc % thì tính lại phí; người dùng vẫn sửa phí thực tế sau đó
    useEffect(() => {
        const rate = feePercent / 100;
        const nextFee =
            inputMode === "A"
                ? calcPercentFee(entered, feePercent)
                : Math.max(0, Math.round(entered - entered / (1 + rate)));
        setValue("feeAmount", nextFee);
    }, [entered, feePercent, inputMode, setValue]);

    // Tự trả x thì phần dịch vụ ứng mặc định = dư nợ − x
    useEffect(() => {
        if (!card || inputMode !== "A") return;
        const remaining = Math.max(0, Math.round(debt - paymentAmount));
        setValue("amount", remaining > 0 ? String(remaining) : "");
    }, [paymentAmount, selfPay]);

    const handleModeChange = (next: string) => {
        const mode = next as InputMode;
        if (mode === inputMode) return;
        // Giữ nguyên A khi đổi cách nhập: ô số tiền chuyển giữa A và n
        setValue("amount", String(Math.round(mode === "N" ? advanced + feeAmount : advanced)));
        setInputMode(mode);
    };

    const interest = interestRate != null && advanced > 0 ? estimateInterest(advanced, interestRate) : null;
    const mismatch = Math.abs(paymentAmount + advanced - debt) > 1;
    const debtAfter = swiped;
    const diff = paymentAmount - feeAmount;

    const submit = handleSubmit(async (values) => {
        if (!card) return;
        const amountA = inputMode === "A" ? values.amount : Math.max(0, values.amount - values.feeAmount);
        await onSubmit({
            sourceOfMoneyId: card._id,
            amount: Math.round(amountA),
            feePercent: values.feePercent,
            feeAmount: values.feeAmount,
            feeCategoryId: values.feeAmount > 0 ? values.feeCategoryId : undefined,
            paymentAmount: selfPay ? values.paymentAmount : 0,
            paymentSourceId: selfPay && values.paymentAmount > 0 ? values.paymentSourceId : undefined,
            provider: values.provider?.trim() || "",
            note: values.note?.trim() || "",
            rolledAt: values.rolledAt.toISOString(),
        });
    });

    useSubmitShortcut(submit, open && tab === "form");

    if (!card || !source) return null;

    return (
        <ResponsiveModal
            title={`Đáo hạn thẻ: ${card.name}`}
            open={open}
            onCancel={onClose}
            onOk={tab === "form" ? submit : onClose}
            confirmLoading={isSubmitting}
            okText={tab === "form" ? "Ghi đáo hạn" : "Đóng"}
            cancelText="Hủy"
            destroyOnHidden
            maskClosable={false}
            width={680}
        >
            <Tabs value={tab} onValueChange={setTab} className="mt-2">
                <TabsList className="mb-3 w-full">
                    <TabsTrigger value="form" className="flex-1">Ghi đáo hạn</TabsTrigger>
                    <TabsTrigger value="analysis" className="flex-1">Phân tích</TabsTrigger>
                </TabsList>

                <TabsContent value="form" className="flex flex-col gap-4">
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
                                    ? `${card.nextDueDate.format("DD/MM")}${card.daysLeft != null ? ` · còn ${card.daysLeft} ngày` : ""}`
                                    : "Chưa đặt"}
                            </p>
                        </div>
                    </div>

                    <Alert variant="destructive">
                        <TriangleAlert />
                        <AlertTitle>Đáo hạn không làm giảm nợ</AlertTitle>
                        <AlertDescription>
                            Bên dịch vụ trả sao kê giúp bạn rồi quẹt lại thẻ bằng giao dịch mua hàng giả. Dư nợ giữ
                            nguyên, bạn mất thêm phí mỗi lần và ngân hàng có thể khóa thẻ nếu phát hiện. App chỉ ghi lại
                            để theo dõi chi phí.
                        </AlertDescription>
                    </Alert>

                    <Form layout="vertical" requiredMark={false} onFinish={submit}>
                        <div className="mb-4 rounded-lg bg-muted/60 p-3">
                            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                <span className="text-sm font-semibold">Tự trả một phần</span>
                                <Label className="flex items-center gap-2 text-xs font-normal">
                                    <Checkbox checked={selfPay} onCheckedChange={(checked) => setSelfPay(checked === true)} />
                                    Có, tôi trả một phần bằng tiền của mình
                                </Label>
                            </div>
                            {selfPay ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-4">
                                    <Form.Item
                                        label="Số tiền bạn trả (x)"
                                        className="mb-2"
                                        validateStatus={errors.paymentAmount ? "error" : undefined}
                                        help={errors.paymentAmount?.message}
                                        extra="Ghi thành Chuyển tiền vào thẻ, giống nút Trả nợ"
                                    >
                                        <Controller
                                            name="paymentAmount"
                                            control={control}
                                            render={({ field }) => (
                                                <DebouncedNumberInput className="w-full!" min={0} step={100000} delay={300} placeholder="0" value={field.value} onChange={field.onChange} />
                                            )}
                                        />
                                    </Form.Item>
                                    <Form.Item
                                        label="Từ nguồn"
                                        className="mb-2"
                                        validateStatus={errors.paymentSourceId ? "error" : undefined}
                                        help={errors.paymentSourceId?.message}
                                        extra={paymentAmount > 0 ? `Phần còn lại ${formatMoney(Math.max(0, debt - paymentAmount))} do dịch vụ ứng` : undefined}
                                    >
                                        <Controller
                                            name="paymentSourceId"
                                            control={control}
                                            render={({ field }) => (
                                                <Select showSearch allowClear optionFilterProp="label" placeholder="Chọn nguồn trả" loading={sourcesLoading} options={paySourceOptions} value={field.value} onChange={(value) => field.onChange(value ?? undefined)} />
                                            )}
                                        />
                                    </Form.Item>
                                </div>
                            ) : null}
                        </div>

                        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                            <span className="text-sm">Số tiền đáo hạn</span>
                            <ChoiceChips
                                options={[
                                    { value: "A", label: "Số dịch vụ ứng (A)" },
                                    { value: "N", label: "Số quẹt lại gồm phí (n)" },
                                ]}
                                value={inputMode}
                                onChange={handleModeChange}
                            />
                        </div>
                        <Form.Item
                            className={MODAL_AUTOFOCUS_CLASS}
                            validateStatus={errors.amount ? "error" : undefined}
                            help={errors.amount?.message}
                            extra={
                                inputMode === "A"
                                    ? `A = dư nợ − phần bạn trả. Tối đa bằng dư nợ đang nợ: ${formatMoney(debt)}`
                                    : `n đã gồm phí · A = n ÷ (1 + ${feePercent}%) = ${formatMoney(advanced)}`
                            }
                        >
                            <Controller
                                name="amount"
                                control={control}
                                render={({ field }) => <AmountInput value={field.value} onChange={field.onChange} />}
                            />
                        </Form.Item>

                        <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-4">
                            <Form.Item
                                label="% phí dịch vụ"
                                validateStatus={errors.feePercent ? "error" : undefined}
                                help={errors.feePercent?.message}
                                extra={defaultPercent ? `Theo cấu hình thẻ: ${defaultPercent}%` : "Nhập % để app tự tính phí; có thể sửa phí bên cạnh"}
                            >
                                <Controller
                                    name="feePercent"
                                    control={control}
                                    render={({ field }) => (
                                        <DebouncedNumberInput className="w-full!" min={0} max={100} step={0.1} delay={300} placeholder="0" value={field.value} onChange={field.onChange} />
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
                                        <DebouncedNumberInput className="w-full!" min={0} step={10000} delay={300} placeholder="0" value={field.value} onChange={field.onChange} />
                                    )}
                                />
                            </Form.Item>
                        </div>

                        {advanced > 0 ? (
                            <div className="mb-4 rounded-lg bg-muted/60 p-3 text-center text-xs">
                                <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-1.5">
                                    <div><p className="text-muted-foreground">Bạn trả (x)</p><Money value={paymentAmount} kind="in" className="font-semibold" /></div>
                                    <span className="text-base text-muted-foreground">+</span>
                                    <div><p className="text-muted-foreground">Dịch vụ ứng (A)</p><Money value={advanced} className="font-semibold" /></div>
                                    <span className="text-base text-muted-foreground">→</span>
                                    <div><p className="text-muted-foreground">Quẹt lại (n = A + phí)</p><Money value={swiped} kind="debt" className="font-semibold" /></div>
                                </div>
                                <p className="mt-2 text-muted-foreground">
                                    Sau lần này dư nợ còn <Money value={debtAfter} className="font-semibold" />,{" "}
                                    {diff >= 0 ? (
                                        <>giảm <Money value={diff} kind="in" className="font-semibold" /></>
                                    ) : (
                                        <span className="text-debt">tăng {formatMoney(-diff)}</span>
                                    )}{" "}
                                    so với hôm nay (x − phí).
                                    {interest != null ? (
                                        <> Lãi nếu không trả hết ≈ <Money value={interest} kind="out" />/30 ngày{feeAmount > interest ? ", phí đáo hạn đang cao hơn lãi." : "."}</>
                                    ) : null}
                                </p>
                                {mismatch ? (
                                    <p className="mt-1 text-warn">
                                        x + A = {formatMoney(paymentAmount + advanced)}, lệch với dư nợ {formatMoney(debt)}. Vẫn lưu được nếu bạn chỉ đáo một phần sao kê.
                                    </p>
                                ) : null}
                            </div>
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
                                    <Select showSearch allowClear optionFilterProp="label" placeholder="Chọn danh mục" loading={categoriesLoading} options={categoryOptions} value={field.value} onChange={(value) => field.onChange(value ?? undefined)} />
                                )}
                            />
                        </Form.Item>

                        <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-4">
                            <Form.Item label="Ngày đáo hạn" validateStatus={errors.rolledAt ? "error" : undefined} help={errors.rolledAt?.message as string | undefined}>
                                <Controller name="rolledAt" control={control} render={({ field }) => <QuickDateField value={field.value} onChange={field.onChange} />} />
                            </Form.Item>
                            <Form.Item label="Bên dịch vụ" validateStatus={errors.provider ? "error" : undefined} help={errors.provider?.message}>
                                <Controller name="provider" control={control} render={({ field }) => <Input {...field} maxLength={100} placeholder="Tên dịch vụ (không bắt buộc)" />} />
                            </Form.Item>
                        </div>

                        <Form.Item label="Ghi chú" className="mb-0" validateStatus={errors.note ? "error" : undefined} help={errors.note?.message}>
                            <Controller name="note" control={control} render={({ field }) => <Input.TextArea {...field} rows={2} maxLength={500} placeholder="Ghi chú (không bắt buộc)" showCount />} />
                        </Form.Item>
                    </Form>

                    <div>
                        <p className="mb-2 text-xs font-medium text-muted-foreground">Lần đáo hạn gần đây của thẻ</p>
                        <RecentRollovers items={items} loading={isLoading} onDelete={onDelete} />
                    </div>
                </TabsContent>

                <TabsContent value="analysis">
                    <RolloverAnalysis source={source} />
                </TabsContent>
            </Tabs>
        </ResponsiveModal>
    );
}
