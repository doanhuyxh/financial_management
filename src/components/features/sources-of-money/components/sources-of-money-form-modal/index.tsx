"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Controller, FormProvider, useForm, useWatch, type FieldErrors } from "react-hook-form";
import dayjs, { type Dayjs } from "dayjs";
import Combobox from "@/components/common/combobox";
import FormField from "@/components/common/form-field";
import DebouncedNumberInput from "@/components/common/input/DebouncedNumberInput";
import ResponsiveModal, { MODAL_AUTOFOCUS_CLASS } from "@/components/common/responsive-modal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/shadcn/ui/avatar";
import { Input } from "@/components/shadcn/ui/input";
import { useSourcesOfMoneyContext } from "@/components/features/sources-of-money/context";
import CreditCardFields from "@/components/features/sources-of-money/components/sources-of-money-form-modal/components/credit-card-fields";
import {
    getSectionsWithErrors,
    numberMinRule,
    RATE_FEE_FIELDS,
    toNumber,
    type CardFeeSectionKey,
    type FormValues,
    type NumberValue,
    type RateFeeFieldName,
} from "@/components/features/sources-of-money/components/sources-of-money-form-modal/utils";
import { useVietQrBanks } from "@/libs/hooks/customHooks/useVietQrBanks";
import type { SelectOption } from "@/libs/interfaces/selectOption";
import {
    SOURCES_OF_MONEY_TYPE_LABELS,
    SourcesOfMoneyType,
    type IFromSourcesOfMoneyData,
    type ISourcesOfMoneyData,
} from "@/libs/interfaces/sourcesOfMoneyData";
import { getTrackedAmount } from "@/libs/utils/trackedAmount";

const typeOptions: SelectOption<SourcesOfMoneyType>[] = Object.values(SourcesOfMoneyType).map(
    (type) => ({
        value: type,
        label: SOURCES_OF_MONEY_TYPE_LABELS[type],
    }),
);

/** Ngày thu phí chỉ có ngày/tháng; dùng năm nhuận để hiển thị được 29/02. */
function toAnnualFeeDate(day?: number, month?: number): Dayjs | null {
    if (!day || !month) return null;
    return dayjs(new Date(2024, month - 1, day));
}

/** Ô số trống dùng "" (không dùng undefined) để DebouncedNumberInput xóa giá trị cũ khi reset. */
const num = (value?: number | null): NumberValue => value ?? "";

const EMPTY_RATE_FEES = Object.fromEntries(
    RATE_FEE_FIELDS.map(({ name }) => [name, ""]),
) as Record<RateFeeFieldName, NumberValue>;

const EMPTY_VALUES: FormValues = {
    ...EMPTY_RATE_FEES,
    name: "",
    type: SourcesOfMoneyType.CASH,
    balance: 0,
    creditLimit: 0,
    currentDebt: 0,
    statementDate: "",
    dueDate: "",
    annualFee: "",
    annualFeeDate: null,
    annualFeeWaiverPeriod: null,
    annualFeeWaiverMinSpend: "",
    managementFee: "",
    managementFeeDay: "",
    managementFeeWaiverMinTransactions: "",
    managementFeeWaiverMinSpend: "",
    paymentFee: "",
    freePaymentsPerCycle: "",
    adjustmentNote: "",
    bankBin: "",
    accountNumber: "",
    accountName: "",
};

function toFormValues(item: ISourcesOfMoneyData): FormValues {
    const details = item.creditDetails;
    return {
        ...EMPTY_VALUES,
        ...(Object.fromEntries(
            RATE_FEE_FIELDS.map(({ name }) => [name, num(details?.[name])]),
        ) as Record<RateFeeFieldName, NumberValue>),
        name: item.name,
        type: item.type,
        balance: num(item.balance),
        creditLimit: num(details?.creditLimit),
        currentDebt: num(details?.currentDebt),
        statementDate: num(details?.statementDate),
        dueDate: num(details?.dueDate),
        annualFee: num(details?.annualFee),
        annualFeeDate: toAnnualFeeDate(details?.annualFeeDay, details?.annualFeeMonth),
        annualFeeWaiverPeriod: details?.annualFeeWaiverPeriod ?? null,
        annualFeeWaiverMinSpend: num(details?.annualFeeWaiverMinSpend),
        managementFee: num(details?.managementFee),
        managementFeeDay: num(details?.managementFeeDay),
        managementFeeWaiverMinTransactions: num(details?.managementFeeWaiverMinTransactions),
        managementFeeWaiverMinSpend: num(details?.managementFeeWaiverMinSpend),
        paymentFee: num(details?.paymentFee),
        freePaymentsPerCycle: num(details?.freePaymentsPerCycle),
        bankBin: item.bankAccount?.bin ?? "",
        accountNumber: item.bankAccount?.accountNumber ?? "",
        accountName: item.bankAccount?.accountName ?? "",
    };
}

export default function SourcesOfMoneyFormModal() {
    const {
        modalOpen,
        editingItem,
        isSubmitting,
        closeModal,
        handleSubmit: submitSource,
    } = useSourcesOfMoneyContext();

    const form = useForm<FormValues>({ mode: "onTouched", defaultValues: EMPTY_VALUES });
    const { control, reset, getValues, handleSubmit } = form;
    const wasOpenRef = useRef(false);
    const fieldId = useId();
    const selectedType = useWatch({ control, name: "type" });
    const isEdit = Boolean(editingItem?._id);
    const isCreditCard = selectedType === SourcesOfMoneyType.CREDIT_CARD;
    const balanceWatch = useWatch({ control, name: "balance" });
    const currentDebtWatch = useWatch({ control, name: "currentDebt" });
    const [activeFeeSections, setActiveFeeSections] = useState<CardFeeSectionKey[]>([]);
    const isBank = selectedType === SourcesOfMoneyType.BANK;
    const bankBinWatch = useWatch({ control, name: "bankBin" });

    const { data: banks = [], isLoading: isBanksLoading, isError: isBanksError } =
        useVietQrBanks(modalOpen && isBank);
    const bankOptions = useMemo<SelectOption[]>(() => {
        const options: SelectOption[] = banks.map((bank) => ({
            value: bank.bin,
            label: bank.shortName,
        }));
        // Ngân hàng đã lưu vẫn hiện tên khi chưa tải được danh sách
        const saved = editingItem?.bankAccount;
        if (saved && !options.some((option) => option.value === saved.bin)) {
            options.unshift({ value: saved.bin, label: saved.bankName });
        }
        return options;
    }, [banks, editingItem]);
    const selectedBank = bankBinWatch ? banks.find((bank) => bank.bin === bankBinWatch) : undefined;

    // Số dư (nguồn thường) hoặc dư nợ (thẻ) lúc mở form; server dùng để phát hiện ghi đè
    const expectedAmount = editingItem ? getTrackedAmount(editingItem) : undefined;
    const enteredAmount = toNumber(isCreditCard ? currentDebtWatch : balanceWatch);
    const amountChanged =
        isEdit && enteredAmount !== undefined && enteredAmount !== expectedAmount;

    useEffect(() => {
        if (!modalOpen) {
            wasOpenRef.current = false;
            return;
        }
        // Form đang mở mà editingItem đổi (409: nạp lại số mới nhất) thì giữ lý do người dùng đã gõ
        const keepNote = wasOpenRef.current;
        wasOpenRef.current = true;
        setActiveFeeSections([]);
        const next = editingItem ? toFormValues(editingItem) : EMPTY_VALUES;
        reset(keepNote ? { ...next, adjustmentNote: getValues("adjustmentNote") } : next);
    }, [modalOpen, editingItem, reset, getValues]);

    // Mở các mục phí đang đóng có ô lỗi để người dùng thấy
    const onInvalid = (errors: FieldErrors<FormValues>) => {
        const sections = getSectionsWithErrors(Object.keys(errors));
        if (sections.length > 0) {
            setActiveFeeSections((current) => Array.from(new Set([...current, ...sections])));
        }
    };

    const onValid = async (values: FormValues) => {
        const payload: IFromSourcesOfMoneyData = {
            name: values.name.trim(),
            type: values.type,
        };

        if (values.type === SourcesOfMoneyType.CREDIT_CARD) {
            payload.creditDetails = {
                creditLimit: toNumber(values.creditLimit) ?? 0,
                currentDebt: toNumber(values.currentDebt) ?? 0,
                statementDate: toNumber(values.statementDate),
                dueDate: toNumber(values.dueDate),
                annualFee: toNumber(values.annualFee),
                annualFeeDay: values.annualFeeDate?.date(),
                annualFeeMonth: values.annualFeeDate ? values.annualFeeDate.month() + 1 : undefined,
                annualFeeWaiverPeriod: values.annualFeeWaiverPeriod ?? undefined,
                annualFeeWaiverMinSpend: values.annualFeeWaiverPeriod
                    ? toNumber(values.annualFeeWaiverMinSpend)
                    : undefined,
                managementFee: toNumber(values.managementFee),
                managementFeeDay: toNumber(values.managementFeeDay),
                managementFeeWaiverMinTransactions: toNumber(
                    values.managementFeeWaiverMinTransactions,
                ),
                managementFeeWaiverMinSpend: toNumber(values.managementFeeWaiverMinSpend),
                paymentFee: toNumber(values.paymentFee),
                freePaymentsPerCycle:
                    toNumber(values.paymentFee) != null
                        ? toNumber(values.freePaymentsPerCycle)
                        : undefined,
                ...Object.fromEntries(
                    RATE_FEE_FIELDS.map(({ name }) => [name, toNumber(values[name])]),
                ),
            };
            payload.balance = 0;
        } else {
            payload.balance = toNumber(values.balance) ?? 0;
        }

        const accountNumber = values.accountNumber?.trim();
        if (values.type === SourcesOfMoneyType.BANK && values.bankBin && accountNumber) {
            payload.bankAccount = {
                bin: values.bankBin,
                bankName: bankOptions.find((option) => option.value === values.bankBin)?.label ?? "",
                accountNumber,
                accountName: values.accountName?.trim() || undefined,
            };
        } else {
            payload.bankAccount = null;
        }

        if (isEdit) {
            payload.expectedAmount = expectedAmount;
            if (amountChanged) payload.adjustmentNote = values.adjustmentNote?.trim();
        }

        await submitSource(payload);
    };

    const handleOk = handleSubmit(onValid, onInvalid);

    return (
        <ResponsiveModal
            title={isEdit ? "Sửa nguồn tiền" : "Thêm nguồn tiền"}
            open={modalOpen}
            onCancel={closeModal}
            onOk={handleOk}
            confirmLoading={isSubmitting}
            destroyOnHidden
            maskClosable={false}
            okText={isEdit ? "Cập nhật" : "Tạo mới"}
            cancelText="Hủy"
            width={580}
        >
            <FormProvider {...form}>
                {/* Không bọc <form>: Enter không được lưu vì ô số debounce có thể chưa đẩy giá trị vào form */}
                <div className="mt-1 flex flex-col gap-4">
                    <Controller
                        name="name"
                        control={control}
                        rules={{
                            required: "Tên nguồn tiền là bắt buộc",
                            maxLength: { value: 100, message: "Tên tối đa 100 ký tự" },
                            validate: (value) =>
                                value.trim().length > 0 || "Tên nguồn tiền là bắt buộc",
                        }}
                        render={({ field, fieldState }) => (
                            <FormField
                                label="Tên nguồn tiền"
                                error={fieldState.error?.message}
                                htmlFor={`${fieldId}-name`}
                                className={MODAL_AUTOFOCUS_CLASS}
                            >
                                <Input
                                    {...field}
                                    id={`${fieldId}-name`}
                                    aria-invalid={fieldState.invalid || undefined}
                                    placeholder="Ví dụ: Ví MoMo, Vietcombank..."
                                    maxLength={100}
                                />
                            </FormField>
                        )}
                    />

                    <Controller
                        name="type"
                        control={control}
                        rules={{ required: "Loại là bắt buộc" }}
                        render={({ field, fieldState }) => (
                            <FormField
                                label="Loại"
                                error={fieldState.error?.message}
                                tooltip={isEdit ? "Không đổi được loại sau khi tạo" : undefined}
                            >
                                <Combobox
                                    options={typeOptions}
                                    placeholder="Chọn loại"
                                    disabled={isEdit}
                                    value={field.value}
                                    onChange={(value) => {
                                        if (value) field.onChange(value);
                                    }}
                                />
                            </FormField>
                        )}
                    />

                    {!isCreditCard ? (
                        <Controller
                            name="balance"
                            control={control}
                            rules={{
                                required: "Số dư là bắt buộc",
                                validate: numberMinRule(0, "Số dư phải >= 0"),
                            }}
                            render={({ field, fieldState }) => (
                                <FormField label="Số dư hiện có" error={fieldState.error?.message}>
                                    <DebouncedNumberInput
                                        value={field.value}
                                        onChange={field.onChange}
                                        onBlur={field.onBlur}
                                        min={0}
                                        precision={0}
                                        placeholder="0"
                                    />
                                </FormField>
                            )}
                        />
                    ) : (
                        <CreditCardFields
                            activeKeys={activeFeeSections}
                            onActiveKeysChange={setActiveFeeSections}
                        />
                    )}

                    {isBank ? (
                        <div className="flex flex-col gap-4">
                            <div className="text-sm font-medium">
                                Tài khoản nhận tiền{" "}
                                <span className="font-normal text-muted-foreground">
                                    (tùy chọn, để tạo mã VietQR)
                                </span>
                            </div>
                            <div className="grid grid-cols-1 gap-x-3 gap-y-4 sm:grid-cols-2">
                                <Controller
                                    name="bankBin"
                                    control={control}
                                    rules={{
                                        validate: (value, formValues) =>
                                            !formValues.accountNumber?.trim() ||
                                            Boolean(value) ||
                                            "Chọn ngân hàng của số tài khoản",
                                    }}
                                    render={({ field, fieldState }) => (
                                        <FormField
                                            label="Ngân hàng"
                                            error={fieldState.error?.message}
                                            extra={
                                                isBanksError
                                                    ? "Không tải được danh sách ngân hàng từ VietQR"
                                                    : undefined
                                            }
                                        >
                                            <div className="flex items-center gap-2">
                                                {selectedBank ? (
                                                    <Avatar className="size-5 rounded-md after:rounded-md">
                                                        <AvatarImage
                                                            src={selectedBank.logo}
                                                            alt=""
                                                            className="rounded-md object-contain"
                                                        />
                                                        <AvatarFallback className="rounded-md text-[10px]">
                                                            {selectedBank.shortName.charAt(0)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                ) : null}
                                                <Combobox
                                                    className="min-w-0 flex-1"
                                                    searchable
                                                    allowClear
                                                    loading={isBanksLoading}
                                                    options={bankOptions}
                                                    placeholder="Chọn ngân hàng"
                                                    searchPlaceholder="Tìm ngân hàng…"
                                                    value={field.value || null}
                                                    onChange={(value) => field.onChange(value ?? "")}
                                                />
                                            </div>
                                        </FormField>
                                    )}
                                />
                                <Controller
                                    name="accountNumber"
                                    control={control}
                                    rules={{
                                        validate: {
                                            required: (value, formValues) =>
                                                !formValues.bankBin ||
                                                Boolean(value?.trim()) ||
                                                "Nhập số tài khoản",
                                            pattern: (value) =>
                                                !value ||
                                                /^[0-9A-Za-z]{1,19}$/.test(value) ||
                                                "Chỉ gồm chữ/số, tối đa 19 ký tự",
                                        },
                                    }}
                                    render={({ field, fieldState }) => (
                                        <FormField
                                            label="Số tài khoản"
                                            error={fieldState.error?.message}
                                            htmlFor={`${fieldId}-account-number`}
                                        >
                                            <Input
                                                {...field}
                                                id={`${fieldId}-account-number`}
                                                aria-invalid={fieldState.invalid || undefined}
                                                placeholder="Ví dụ: 0123456789"
                                                maxLength={19}
                                            />
                                        </FormField>
                                    )}
                                />
                            </div>
                            <Controller
                                name="accountName"
                                control={control}
                                rules={{ maxLength: { value: 50, message: "Tối đa 50 ký tự" } }}
                                render={({ field, fieldState }) => (
                                    <FormField
                                        label="Tên chủ tài khoản"
                                        error={fieldState.error?.message}
                                        extra="Lưu dạng in hoa, không dấu"
                                        htmlFor={`${fieldId}-account-name`}
                                    >
                                        <Input
                                            {...field}
                                            id={`${fieldId}-account-name`}
                                            aria-invalid={fieldState.invalid || undefined}
                                            placeholder="NGUYEN VAN A"
                                            maxLength={50}
                                        />
                                    </FormField>
                                )}
                            />
                        </div>
                    ) : null}

                    {amountChanged ? (
                        <Controller
                            name="adjustmentNote"
                            control={control}
                            rules={{ maxLength: { value: 200, message: "Tối đa 200 ký tự" } }}
                            render={({ field, fieldState }) => (
                                <FormField
                                    label="Lý do điều chỉnh"
                                    error={fieldState.error?.message}
                                    extra="Lần điều chỉnh này được lưu vào lịch sử của nguồn tiền"
                                    htmlFor={`${fieldId}-adjustment-note`}
                                >
                                    <Input
                                        {...field}
                                        id={`${fieldId}-adjustment-note`}
                                        aria-invalid={fieldState.invalid || undefined}
                                        placeholder="Ví dụ: Đối chiếu với app ngân hàng"
                                        maxLength={200}
                                    />
                                </FormField>
                            )}
                        />
                    ) : null}
                </div>
            </FormProvider>
        </ResponsiveModal>
    );
}
