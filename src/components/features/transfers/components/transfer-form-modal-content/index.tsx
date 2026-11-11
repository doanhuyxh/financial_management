"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Info } from "lucide-react";
import ResponsiveModal, {
    MODAL_AUTOFOCUS_CLASS,
    focusModalField,
} from "@/components/common/responsive-modal";
import FormField from "@/components/common/form-field";
import Combobox from "@/components/common/combobox";
import QuickDateField from "@/components/common/quick-date-field";
import TransactionTypeSwitch from "@/components/common/transaction-type-switch";
import { Alert, AlertTitle } from "@/components/shadcn/ui/alert";
import { Switch } from "@/components/shadcn/ui/switch";
import { Textarea } from "@/components/shadcn/ui/textarea";
import { useSubmitShortcut } from "@/libs/hooks/useHotkey";
import dayjs from "dayjs";
import DebouncedNumberInput from "@/components/common/input/DebouncedNumberInput";
import AmountSuggestionChips from "@/components/common/amount-suggestion-chips";
import AmountInput from "@/components/common/amount-input";
import CardPaymentFeeAlert from "@/components/common/card-payment-fee-alert";
import TransferPairSuggestions from "@/components/features/transfers/components/transfer-pair-suggestions";
import { formatMoney } from "@/components/features/transfers/utils";
import { useGetCategories } from "@/libs/hooks/customHooks/useCategories";
import { CategoryKind } from "@/libs/interfaces/categoriesData";
import { filterCategoriesByKind } from "@/libs/utils/categoryKind";
import { useGetSourcesOfMoney } from "@/libs/hooks/customHooks/useSourcesOfMoney";
import { useGetTransferSuggestions } from "@/libs/hooks/customHooks/useTransfers";
import type { IFromTransfersData } from "@/libs/interfaces/transfersData";
import type { ITransferPairSuggestion } from "@/libs/interfaces/suggestionsData";
import {
    SOURCES_OF_MONEY_TYPE_LABELS,
    SourcesOfMoneyType,
    type ISourcesOfMoneyData,
} from "@/libs/interfaces/sourcesOfMoneyData";
import { groupSuggestedOptions } from "@/libs/utils/suggestionOptions";
import { calcPercentFee } from "@/libs/utils/cardFee";
import ChoiceChips from "@/components/common/choice-chips";

type FormValues = {
    fromSourceId: string;
    toSourceId: string;
    amount: string | number | null;
    feePercent: string | number | null;
    /** "" = chưa chọn */
    feeCategoryId: string;
    note: string;
    transferredAt: dayjs.Dayjs;
};

const NOTE_MAX_LENGTH = 500;

export type TransferFormModalContentProps = {
    open: boolean;
    /** Hiện nút đổi loại giao dịch ở tiêu đề (chỉ trên trang Giao dịch) */
    showTypeSwitch?: boolean;
    /** Điền sẵn khi mở form (nguồn, đích, số tiền) */
    defaults?: { fromSourceId?: string; toSourceId?: string; amount?: number } | null;
    isSubmitting: boolean;
    onClose: () => void;
    onSubmit: (
        values: IFromTransfersData,
        options?: { keepOpen?: boolean },
    ) => Promise<boolean>;
};

function getAvailableOut(source?: ISourcesOfMoneyData | null) {
    if (!source) return null;
    if (source.type === SourcesOfMoneyType.CREDIT_CARD) {
        const limit = source.creditDetails?.creditLimit ?? 0;
        const debt = source.creditDetails?.currentDebt ?? 0;
        return Math.max(0, limit - debt);
    }
    return source.balance ?? 0;
}

function getMaxToCredit(source?: ISourcesOfMoneyData | null) {
    if (!source || source.type !== SourcesOfMoneyType.CREDIT_CARD) return null;
    return source.creditDetails?.currentDebt ?? 0;
}

function createFormDefaults(): FormValues {
    return {
        fromSourceId: "",
        toSourceId: "",
        amount: "",
        feePercent: 0,
        feeCategoryId: "",
        note: "",
        transferredAt: dayjs(),
    };
}

export default function TransferFormModalContent({
    open,
    showTypeSwitch = false,
    defaults,
    isSubmitting,
    onClose,
    onSubmit,
}: TransferFormModalContentProps) {
    const [keepCreating, setKeepCreating] = useState(false);
    const noteId = useId();

    const { control, handleSubmit, reset, getValues, setValue, setError } = useForm<FormValues>({
        mode: "onChange",
        defaultValues: createFormDefaults(),
    });

    const fromSourceId = useWatch({ control, name: "fromSourceId" });
    const toSourceId = useWatch({ control, name: "toSourceId" });
    const amountWatch = useWatch({ control, name: "amount" });
    const feePercentWatch = useWatch({ control, name: "feePercent" });
    const transferredAtWatch = useWatch({ control, name: "transferredAt" });

    const { data: categoriesData, isLoading: categoriesLoading } = useGetCategories({
        page: 1,
        limit: 100,
    });
    const { data: sourcesData, isLoading: sourcesLoading } = useGetSourcesOfMoney({
        page: 1,
        limit: 100,
    });
    const { data: suggestionsData } = useGetTransferSuggestions(open);
    const suggestions = suggestionsData?.data;

    const sources = sourcesData?.data?.items ?? [];

    const fromSource = useMemo(
        () => sources.find((item) => item._id === fromSourceId) ?? null,
        [sources, fromSourceId],
    );
    const toSource = useMemo(
        () => sources.find((item) => item._id === toSourceId) ?? null,
        [sources, toSourceId],
    );

    const fromIsCredit = fromSource?.type === SourcesOfMoneyType.CREDIT_CARD;
    const toIsCredit = toSource?.type === SourcesOfMoneyType.CREDIT_CARD;

    const amount = Number(amountWatch) || 0;
    const feePercent = fromIsCredit ? Number(feePercentWatch) || 0 : 0;
    // Giống server: phí rút tiền mặt tối thiểu của thẻ áp dụng khi có % phí
    const cashAdvanceFeeMin = fromIsCredit ? fromSource?.creditDetails?.cashAdvanceFeeMin : undefined;
    const interestRate = fromIsCredit ? fromSource?.creditDetails?.interestRate : undefined;
    const feeAmount =
        fromIsCredit && feePercent > 0
            ? calcPercentFee(amount, feePercent, cashAdvanceFeeMin)
            : 0;
    const receiveAmount = fromIsCredit ? Math.max(0, amount - feeAmount) : amount;

    // Rule của react-hook-form được đăng ký lúc mount/onChange nên đọc giá trị mới nhất qua ref
    // (cập nhật sau mỗi render; validate chỉ chạy lúc có sự kiện nên luôn thấy giá trị mới)
    const feeRuleRef = useRef({ fromIsCredit, feePercent });
    useEffect(() => {
        feeRuleRef.current = { fromIsCredit, feePercent };
    });

    const availableOut = getAvailableOut(fromSource);
    const maxToCredit = getMaxToCredit(toSource);

    const categoryOptions = filterCategoriesByKind(
        categoriesData?.data?.items ?? [],
        CategoryKind.EXPENSE,
    ).map((item) => ({
        value: item._id,
        label: item.name,
    }));

    const sourceOptions = sources.map((item) => ({
        value: item._id,
        label: `${item.name} (${SOURCES_OF_MONEY_TYPE_LABELS[item.type]})`,
    }));

    const fromOptions = groupSuggestedOptions(sourceOptions, suggestions?.fromSourceIds);

    const pairsFromSelected = (suggestions?.pairs ?? []).filter(
        (pair) => pair.fromSourceId === fromSourceId,
    );
    const selectedPair = pairsFromSelected.find((pair) => pair.toSourceId === toSourceId);

    // Chưa chọn nguồn thì gợi ý số tiền chung; đã chọn đúng cặp quen thì gợi ý theo cặp
    const amountSuggestions = selectedPair
        ? selectedPair.amounts
        : !fromSourceId
          ? suggestions?.topAmounts
          : undefined;

    const handleFromChange = (nextFromId?: string) => {
        if (!nextFromId || getValues("toSourceId")) return;
        const suggestedPair = suggestions?.pairs.find(
            (pair) =>
                pair.fromSourceId === nextFromId &&
                sources.some((item) => item._id === pair.toSourceId),
        );
        if (suggestedPair) {
            setValue("toSourceId", suggestedPair.toSourceId, { shouldValidate: true });
        }
    };

    const handlePairSelect = (pair: ITransferPairSuggestion) => {
        setValue("fromSourceId", pair.fromSourceId, { shouldValidate: true });
        setValue("toSourceId", pair.toSourceId, { shouldValidate: true });
    };

    const handleAmountSuggestion = (value: number) => {
        setValue("amount", String(value), { shouldValidate: true });
    };

    const toOptionsFlat = sourceOptions.filter((opt) => {
        if (opt.value === fromSourceId) return false;
        // Disallow CC → CC
        if (fromIsCredit) {
            const target = sources.find((s) => s._id === opt.value);
            return target?.type !== SourcesOfMoneyType.CREDIT_CARD;
        }
        return true;
    });
    const toOptions = groupSuggestedOptions(
        toOptionsFlat,
        pairsFromSelected.map((pair) => pair.toSourceId),
    );

    // Chip "thường dùng": nguồn hay chuyển đi, và nguồn hay nhận từ nguồn đang chọn
    const sourceHint = (item: (typeof sources)[number]) =>
        item.type === SourcesOfMoneyType.CREDIT_CARD
            ? `còn ${formatMoney(getAvailableOut(item))}`
            : formatMoney(item.balance ?? 0);
    const fromChips = (suggestions?.fromSourceIds ?? [])
        .map((id) => sources.find((item) => item._id === id))
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
        .slice(0, 3)
        .map((item) => ({ value: item._id, label: item.name, hint: sourceHint(item) }));
    const toChips = pairsFromSelected
        .filter((pair) => toOptionsFlat.some((option) => option.value === pair.toSourceId))
        .map((pair) => sources.find((item) => item._id === pair.toSourceId))
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
        .slice(0, 3)
        .map((item) => ({
            value: item._id,
            label: item.name,
            hint:
                item.type === SourcesOfMoneyType.CREDIT_CARD
                    ? `nợ ${formatMoney(item.creditDetails?.currentDebt ?? 0)}`
                    : formatMoney(item.balance ?? 0),
        }));

    const selectFrom = (id: string) => {
        setValue("fromSourceId", id, { shouldValidate: true });
        handleFromChange(id);
    };
    const selectTo = (id: string) => {
        setValue("toSourceId", id, { shouldValidate: true });
    };

    useEffect(() => {
        if (!open) {
            setKeepCreating(false);
            return;
        }
        reset({
            ...createFormDefaults(),
            ...(defaults
                ? {
                      fromSourceId: defaults.fromSourceId ?? "",
                      toSourceId: defaults.toSourceId ?? "",
                      amount: defaults.amount != null ? String(defaults.amount) : "",
                  }
                : {}),
        });
    }, [open, reset, defaults]);

    // Đổi nguồn chuyển: thẻ có cấu hình phí rút tiền mặt thì điền sẵn %, người dùng vẫn sửa được
    const cashAdvanceFeePercent = fromIsCredit
        ? fromSource?.creditDetails?.cashAdvanceFeePercent
        : undefined;
    useEffect(() => {
        if (!fromIsCredit) {
            setValue("feePercent", 0);
            setValue("feeCategoryId", "");
        } else if (cashAdvanceFeePercent != null) {
            setValue("feePercent", cashAdvanceFeePercent);
        }
    }, [fromIsCredit, fromSourceId, cashAdvanceFeePercent, setValue]);

    useEffect(() => {
        if (toIsCredit && fromIsCredit) {
            setValue("toSourceId", "");
        }
    }, [toIsCredit, fromIsCredit, setValue]);

    const onValid = async (values: FormValues) => {
        const parsedAmount = Number(values.amount);
        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
            setError("amount", { message: "Số tiền phải lớn hơn 0" });
            return;
        }

        const selectedFrom = sources.find((s) => s._id === values.fromSourceId);
        const selectedTo = sources.find((s) => s._id === values.toSourceId);
        if (!selectedFrom || !selectedTo) return;

        if (
            selectedFrom.type === SourcesOfMoneyType.CREDIT_CARD &&
            selectedTo.type === SourcesOfMoneyType.CREDIT_CARD
        ) {
            setError("toSourceId", { message: "Không hỗ trợ chuyển giữa hai thẻ tín dụng" });
            return;
        }

        const parsedFeePercent =
            selectedFrom.type === SourcesOfMoneyType.CREDIT_CARD
                ? Number(values.feePercent) || 0
                : 0;
        const parsedFeeAmount =
            parsedFeePercent > 0
                ? Math.round((parsedAmount * parsedFeePercent) / 100)
                : 0;

        if (selectedTo.type === SourcesOfMoneyType.CREDIT_CARD) {
            const debt = selectedTo.creditDetails?.currentDebt ?? 0;
            if (parsedAmount > debt) {
                setError("amount", {
                    message: `Tối đa bằng dư nợ đang nợ (${formatMoney(debt)})`,
                });
                return;
            }
        }

        if (
            selectedFrom.type === SourcesOfMoneyType.CREDIT_CARD &&
            parsedFeeAmount > 0 &&
            !values.feeCategoryId
        ) {
            setError("feeCategoryId", { message: "Danh mục chi tiêu phí là bắt buộc" });
            return;
        }

        const payload: IFromTransfersData = {
            fromSourceId: values.fromSourceId,
            toSourceId: values.toSourceId,
            amount: parsedAmount,
            feePercent: parsedFeePercent,
            feeCategoryId: parsedFeeAmount > 0 ? values.feeCategoryId : undefined,
            note: values.note?.trim() || "",
            transferredAt: values.transferredAt.toISOString(),
        };

        const success = await onSubmit(payload, { keepOpen: keepCreating });
        if (success && keepCreating) {
            // Giữ lại ngày đã chọn để nhập nhanh nhiều khoản trong cùng ngày
            reset({ ...createFormDefaults(), transferredAt: getValues("transferredAt") });
            focusModalField();
        }
    };

    const handleOk = handleSubmit(onValid);

    useSubmitShortcut(handleOk, open);

    let amountExtra: string | undefined;
    if (toIsCredit && maxToCredit != null) {
        amountExtra = `Tối đa trả nợ: ${formatMoney(maxToCredit)}`;
    } else if (fromSource && availableOut != null) {
        amountExtra = fromIsCredit
            ? `Hạn mức còn lại: ${formatMoney(availableOut)}`
            : `Số dư hiện có: ${formatMoney(availableOut)}`;
    }

    return (
        <ResponsiveModal
            title={showTypeSwitch ? <TransactionTypeSwitch value="transfer" /> : "Chuyển tiền"}
            open={open}
            onCancel={onClose}
            onOk={handleOk}
            confirmLoading={isSubmitting}
            destroyOnHidden
            okText="Chuyển tiền"
            cancelText="Hủy"
            width={600}
            footer={(_, { OkBtn, CancelBtn }) => (
                <div className="flex items-center justify-end gap-3">
                    <label className="mr-auto flex shrink-0 cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                        <Switch size="sm" checked={keepCreating} onCheckedChange={setKeepCreating} />
                        Tạo tiếp
                    </label>
                    {/* Mobile: 1 hàng [Tạo tiếp | nút chính], bỏ Hủy vì Drawer đã có nút đóng */}
                    <div className="flex flex-1 items-center justify-end gap-2 md:flex-none">
                        <span className="hidden md:contents">
                            <CancelBtn />
                        </span>
                        <div className="flex-1 md:flex-none">
                            <OkBtn />
                        </div>
                    </div>
                </div>
            )}
        >
            <div className="mt-4 flex flex-col gap-4">
                <Controller
                    name="amount"
                    control={control}
                    rules={{ required: "Số tiền là bắt buộc" }}
                    render={({ field, fieldState }) => (
                        <FormField
                            label="Số tiền"
                            className={MODAL_AUTOFOCUS_CLASS}
                            error={fieldState.error?.message}
                            extra={amountExtra}
                        >
                            <AmountInput value={field.value} onChange={field.onChange} defaultKeypadOpen />
                            <AmountSuggestionChips
                                amounts={amountSuggestions}
                                value={amountWatch}
                                onSelect={handleAmountSuggestion}
                            />
                        </FormField>
                    )}
                />

                <TransferPairSuggestions
                    pairs={suggestions?.pairs}
                    sources={sources}
                    fromSourceId={fromSourceId}
                    toSourceId={toSourceId}
                    onSelect={handlePairSelect}
                />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-x-4">
                    <Controller
                        name="fromSourceId"
                        control={control}
                        rules={{ required: "Nguồn chuyển là bắt buộc" }}
                        render={({ field, fieldState }) => (
                            <FormField
                                label="Từ nguồn"
                                error={fieldState.error?.message}
                                extra={
                                    fromSource
                                        ? fromIsCredit
                                            ? `Hạn mức còn lại: ${formatMoney(availableOut)}`
                                            : `Số dư: ${formatMoney(availableOut)}`
                                        : undefined
                                }
                            >
                                <div className="flex flex-col gap-2">
                                    <ChoiceChips
                                        options={fromChips}
                                        value={field.value}
                                        onChange={selectFrom}
                                    />
                                    <Combobox
                                        value={field.value || null}
                                        onChange={(value) => {
                                            field.onChange(value ?? "");
                                            handleFromChange(value);
                                        }}
                                        options={fromOptions}
                                        placeholder="Chọn nguồn chuyển"
                                        loading={sourcesLoading}
                                        searchable
                                    />
                                </div>
                            </FormField>
                        )}
                    />

                    <Controller
                        name="toSourceId"
                        control={control}
                        rules={{ required: "Nguồn nhận là bắt buộc" }}
                        render={({ field, fieldState }) => (
                            <FormField
                                label="Đến nguồn"
                                error={fieldState.error?.message}
                                extra={
                                    toIsCredit && maxToCredit != null
                                        ? `Dư nợ đang nợ: ${formatMoney(maxToCredit)}`
                                        : toSource
                                          ? `Số dư: ${formatMoney(toSource.balance ?? 0)}`
                                          : undefined
                                }
                            >
                                <div className="flex flex-col gap-2">
                                    <ChoiceChips options={toChips} value={field.value} onChange={selectTo} />
                                    <Combobox
                                        value={field.value || null}
                                        onChange={(value) => field.onChange(value ?? "")}
                                        options={toOptions}
                                        placeholder="Chọn nguồn nhận"
                                        loading={sourcesLoading}
                                        searchable
                                    />
                                </div>
                            </FormField>
                        )}
                    />
                </div>

                <CardPaymentFeeAlert source={toSource} date={transferredAtWatch} />

                {fromIsCredit && !toIsCredit && interestRate != null ? (
                    <Alert>
                        <Info />
                        <AlertTitle className="font-normal">
                            {`Rút tiền từ thẻ bị tính lãi ${interestRate}%/năm ngay từ ngày rút, đến khi trả hết`}
                        </AlertTitle>
                    </Alert>
                ) : null}

                {fromIsCredit && !toIsCredit ? (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-x-4">
                        <Controller
                            name="feePercent"
                            control={control}
                            rules={{
                                validate: (value) =>
                                    (Number(value) || 0) <= 100 || "% phí tối đa là 100",
                            }}
                            render={({ field, fieldState }) => (
                                <FormField
                                    label="% phí chuyển đổi"
                                    error={fieldState.error?.message}
                                    extra={
                                        amount > 0
                                            ? `Phí: ${formatMoney(feeAmount)}${cashAdvanceFeeMin && feePercent > 0 ? ` (tối thiểu ${formatMoney(cashAdvanceFeeMin)})` : ""} · Nhận thực tế: ${formatMoney(receiveAmount)}`
                                            : "Phí trừ vào số tiền nhận; dư nợ thẻ tăng đúng số tiền chuyển"
                                    }
                                >
                                    <DebouncedNumberInput
                                        value={field.value}
                                        onChange={field.onChange}
                                        min={0}
                                        placeholder="0"
                                        delay={300}
                                        suffix="%"
                                    />
                                </FormField>
                            )}
                        />

                        <Controller
                            name="feeCategoryId"
                            control={control}
                            rules={{
                                validate: (value) =>
                                    !(feeRuleRef.current.fromIsCredit && feeRuleRef.current.feePercent > 0) ||
                                    Boolean(value) ||
                                    "Danh mục chi tiêu phí là bắt buộc",
                            }}
                            render={({ field, fieldState }) => (
                                <FormField
                                    label="Danh mục chi tiêu phí"
                                    error={fieldState.error?.message}
                                    extra={
                                        feePercent > 0
                                            ? "Phí sẽ được ghi nhận là một khoản chi tiêu"
                                            : "Chỉ bắt buộc khi % phí > 0"
                                    }
                                >
                                    <Combobox
                                        value={field.value || null}
                                        onChange={(value) => field.onChange(value ?? "")}
                                        options={categoryOptions}
                                        placeholder="Chọn danh mục"
                                        loading={categoriesLoading}
                                        allowClear
                                        searchable
                                    />
                                </FormField>
                            )}
                        />
                    </div>
                ) : null}

                <Controller
                    name="transferredAt"
                    control={control}
                    rules={{ required: "Ngày chuyển là bắt buộc" }}
                    render={({ field, fieldState }) => (
                        <FormField label="Ngày chuyển" error={fieldState.error?.message}>
                            <QuickDateField value={field.value} onChange={field.onChange} />
                        </FormField>
                    )}
                />

                <Controller
                    name="note"
                    control={control}
                    render={({ field, fieldState }) => (
                        <FormField
                            label="Ghi chú"
                            htmlFor={noteId}
                            error={fieldState.error?.message}
                            extra={
                                <span className="block text-right tabular-nums">
                                    {(field.value ?? "").length}/{NOTE_MAX_LENGTH}
                                </span>
                            }
                        >
                            <Textarea
                                {...field}
                                id={noteId}
                                rows={2}
                                maxLength={NOTE_MAX_LENGTH}
                                placeholder="Ghi chú (không bắt buộc)"
                                aria-invalid={fieldState.invalid || undefined}
                            />
                        </FormField>
                    )}
                />
            </div>
        </ResponsiveModal>
    );
}
