"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import dayjs from "dayjs";
import { Trash2, TriangleAlert } from "lucide-react";
import ResponsiveModal, { MODAL_AUTOFOCUS_CLASS } from "@/components/common/responsive-modal";
import AmountInput from "@/components/common/amount-input";
import ChoiceChips from "@/components/common/choice-chips";
import Combobox from "@/components/common/combobox";
import FormField from "@/components/common/form-field";
import DebouncedNumberInput from "@/components/common/input/DebouncedNumberInput";
import QuickDateField from "@/components/common/quick-date-field";
import Money from "@/components/common/money";
import RolloverAnalysis from "@/components/common/rollover-analysis";
import { Alert, AlertDescription, AlertTitle } from "@/components/shadcn/ui/alert";
import { Button } from "@/components/shadcn/ui/button";
import { Checkbox } from "@/components/shadcn/ui/checkbox";
import { Input } from "@/components/shadcn/ui/input";
import { Label } from "@/components/shadcn/ui/label";
import { Skeleton } from "@/components/shadcn/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/shadcn/ui/tabs";
import { Textarea } from "@/components/shadcn/ui/textarea";
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

const NOTE_MAX_LENGTH = 500;
const PROVIDER_INPUT_ID = "card-rollover-provider";
const NOTE_INPUT_ID = "card-rollover-note";

function RecentRollovers({
    items,
    loading,
    onDelete,
}: {
    items: ICardRolloverData[];
    loading: boolean;
    onDelete: (item: ICardRolloverData) => void;
}) {
    if (loading) {
        return (
            <div className="flex flex-col gap-3">
                <Skeleton className="skeleton-shimmer h-4 w-full animate-none" />
                <Skeleton className="skeleton-shimmer h-4 w-3/5 animate-none" />
            </div>
        );
    }
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

    const { control, handleSubmit, reset, setValue } = useForm<
        CardRolloverFormInput,
        unknown,
        CardRolloverFormValues
    >({
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

                    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
                        <div className="rounded-lg bg-muted/60 p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-sm font-semibold">Tự trả một phần</span>
                                <Label className="flex items-center gap-2 text-xs font-normal">
                                    <Checkbox checked={selfPay} onCheckedChange={(checked) => setSelfPay(checked === true)} />
                                    Có, tôi trả một phần bằng tiền của mình
                                </Label>
                            </div>
                            {selfPay ? (
                                <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-x-4">
                                    <Controller
                                        name="paymentAmount"
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <FormField
                                                label="Số tiền bạn trả (x)"
                                                error={fieldState.error?.message}
                                                extra="Ghi thành Chuyển tiền vào thẻ, giống nút Trả nợ"
                                            >
                                                <DebouncedNumberInput
                                                    min={0}
                                                    precision={0}
                                                    delay={300}
                                                    placeholder="0"
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    onBlur={field.onBlur}
                                                />
                                            </FormField>
                                        )}
                                    />
                                    <Controller
                                        name="paymentSourceId"
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <FormField
                                                label="Từ nguồn"
                                                error={fieldState.error?.message}
                                                extra={
                                                    paymentAmount > 0
                                                        ? `Phần còn lại ${formatMoney(Math.max(0, debt - paymentAmount))} do dịch vụ ứng`
                                                        : undefined
                                                }
                                            >
                                                <Combobox
                                                    allowClear
                                                    placeholder="Chọn nguồn trả"
                                                    loading={sourcesLoading}
                                                    options={paySourceOptions}
                                                    value={field.value}
                                                    onChange={(value) => field.onChange(value ?? undefined)}
                                                />
                                            </FormField>
                                        )}
                                    />
                                </div>
                            ) : null}
                        </div>

                        <div className="flex flex-col gap-1">
                            <div className="flex flex-wrap items-center justify-between gap-2">
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
                            <Controller
                                name="amount"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <FormField
                                        className={MODAL_AUTOFOCUS_CLASS}
                                        error={fieldState.error?.message}
                                        extra={
                                            inputMode === "A"
                                                ? `A = dư nợ − phần bạn trả. Tối đa bằng dư nợ đang nợ: ${formatMoney(debt)}`
                                                : `n đã gồm phí · A = n ÷ (1 + ${feePercent}%) = ${formatMoney(advanced)}`
                                        }
                                    >
                                        <AmountInput value={field.value} onChange={field.onChange} />
                                    </FormField>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-x-4">
                            <Controller
                                name="feePercent"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <FormField
                                        label="% phí dịch vụ"
                                        error={fieldState.error?.message}
                                        extra={
                                            defaultPercent
                                                ? `Theo cấu hình thẻ: ${defaultPercent}%`
                                                : "Nhập % để app tự tính phí; có thể sửa phí bên cạnh"
                                        }
                                    >
                                        <DebouncedNumberInput
                                            min={0}
                                            delay={300}
                                            placeholder="0"
                                            value={field.value}
                                            onChange={field.onChange}
                                            onBlur={field.onBlur}
                                        />
                                    </FormField>
                                )}
                            />
                            <Controller
                                name="feeAmount"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <FormField
                                        label="Phí thực tế"
                                        error={fieldState.error?.message}
                                        extra="Dư nợ thẻ sẽ tăng đúng số này"
                                    >
                                        <DebouncedNumberInput
                                            min={0}
                                            precision={0}
                                            delay={300}
                                            placeholder="0"
                                            value={field.value}
                                            onChange={field.onChange}
                                            onBlur={field.onBlur}
                                        />
                                    </FormField>
                                )}
                            />
                        </div>

                        {advanced > 0 ? (
                            <div className="rounded-lg bg-muted/60 p-3 text-center text-xs">
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

                        <Controller
                            name="feeCategoryId"
                            control={control}
                            render={({ field, fieldState }) => (
                                <FormField
                                    label="Danh mục chi tiêu phí"
                                    error={fieldState.error?.message}
                                    extra={feeAmount > 0 ? "Phí được ghi thành một khoản chi tiêu trên thẻ" : "Chỉ bắt buộc khi phí > 0"}
                                >
                                    <Combobox
                                        allowClear
                                        placeholder="Chọn danh mục"
                                        loading={categoriesLoading}
                                        options={categoryOptions}
                                        value={field.value}
                                        onChange={(value) => field.onChange(value ?? undefined)}
                                    />
                                </FormField>
                            )}
                        />

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-x-4">
                            <Controller
                                name="rolledAt"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <FormField label="Ngày đáo hạn" error={fieldState.error?.message}>
                                        <QuickDateField value={field.value} onChange={field.onChange} />
                                    </FormField>
                                )}
                            />
                            <Controller
                                name="provider"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <FormField label="Bên dịch vụ" error={fieldState.error?.message} htmlFor={PROVIDER_INPUT_ID}>
                                        <Input
                                            {...field}
                                            id={PROVIDER_INPUT_ID}
                                            value={field.value ?? ""}
                                            aria-invalid={fieldState.invalid || undefined}
                                            maxLength={100}
                                            placeholder="Tên dịch vụ (không bắt buộc)"
                                        />
                                    </FormField>
                                )}
                            />
                        </div>

                        <Controller
                            name="note"
                            control={control}
                            render={({ field, fieldState }) => (
                                <FormField
                                    label="Ghi chú"
                                    error={fieldState.error?.message}
                                    htmlFor={NOTE_INPUT_ID}
                                    extra={
                                        <span className="block text-right tabular-nums">
                                            {(field.value ?? "").length}/{NOTE_MAX_LENGTH}
                                        </span>
                                    }
                                >
                                    <Textarea
                                        {...field}
                                        id={NOTE_INPUT_ID}
                                        value={field.value ?? ""}
                                        aria-invalid={fieldState.invalid || undefined}
                                        rows={2}
                                        maxLength={NOTE_MAX_LENGTH}
                                        placeholder="Ghi chú (không bắt buộc)"
                                    />
                                </FormField>
                            )}
                        />
                    </form>

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
