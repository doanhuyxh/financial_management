"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import ResponsiveModal, {
    MODAL_AUTOFOCUS_CLASS,
    focusModalField,
} from "@/components/common/responsive-modal";
import ChoiceChips from "@/components/common/choice-chips";
import Combobox from "@/components/common/combobox";
import FormField from "@/components/common/form-field";
import QuickDateField from "@/components/common/quick-date-field";
import TransactionTypeSwitch from "@/components/common/transaction-type-switch";
import { Switch } from "@/components/shadcn/ui/switch";
import { Textarea } from "@/components/shadcn/ui/textarea";
import { useSubmitShortcut } from "@/libs/hooks/useHotkey";
import dayjs from "dayjs";
import AmountSuggestionChips from "@/components/common/amount-suggestion-chips";
import AmountInput from "@/components/common/amount-input";
import CardUsageFeeAlert from "@/components/features/expenses/components/expenses-form-modal/components/card-usage-fee-alert";
import { useExpensesContext } from "@/components/features/expenses/context";
import {
    formatMoney,
    getExpenseCategory,
    getExpenseSource,
    getRefId,
} from "@/components/features/expenses/utils";
import { appendCurrentOption } from "@/libs/utils/archivedRef";
import { useGetCategories } from "@/libs/hooks/customHooks/useCategories";
import { CategoryKind } from "@/libs/interfaces/categoriesData";
import { filterCategoriesByKind } from "@/libs/utils/categoryKind";
import { useGetExpenseSuggestions } from "@/libs/hooks/customHooks/useExpenses";
import { useGetSourcesOfMoney } from "@/libs/hooks/customHooks/useSourcesOfMoney";
import type { IFromExpensesData } from "@/libs/interfaces/expensesData";
import {
    FOREIGN_FEE_TYPE_LABELS,
    ForeignFeeType,
    SOURCES_OF_MONEY_TYPE_LABELS,
    SourcesOfMoneyType,
    type ISourcesOfMoneyData,
} from "@/libs/interfaces/sourcesOfMoneyData";
import { groupSuggestedOptions } from "@/libs/utils/suggestionOptions";
import { calcPercentFee, getForeignFeeConfig } from "@/libs/utils/cardFee";

type FormValues = {
    categoryId: string;
    sourceOfMoneyId: string;
    amount: string | number | null;
    note: string;
    spentAt: dayjs.Dayjs;
    foreignFeeType: ForeignFeeType | null;
};

const NOTE_MAX_LENGTH = 500;

/** Giá trị form tạo mới: trống, ngày chi = hôm nay. */
function createEmptyValues(): FormValues {
    return {
        categoryId: "",
        sourceOfMoneyId: "",
        amount: "",
        note: "",
        spentAt: dayjs(),
        foreignFeeType: null,
    };
}

function getSourceRemaining(source?: ISourcesOfMoneyData | null) {
    if (!source) return null;
    if (source.type === SourcesOfMoneyType.CREDIT_CARD) {
        const limit = source.creditDetails?.creditLimit ?? 0;
        const debt = source.creditDetails?.currentDebt ?? 0;
        return Math.max(0, limit - debt);
    }
    return source.balance ?? 0;
}

export default function ExpensesFormModal() {
    const {
        modalOpen,
        editingItem,
        createDefaults,
        isSubmitting,
        closeModal,
        handleSubmit: submitExpense,
    } = useExpensesContext();

    const {
        control,
        handleSubmit,
        reset,
        setValue,
        getValues,
        setError,
        clearErrors,
        formState: { errors },
    } = useForm<FormValues>({ mode: "onChange", defaultValues: createEmptyValues() });
    const [keepCreating, setKeepCreating] = useState(false);
    const noteId = useId();
    const selectedSourceId = useWatch({ control, name: "sourceOfMoneyId" });
    const selectedCategoryId = useWatch({ control, name: "categoryId" });
    const amountWatch = useWatch({ control, name: "amount" });
    const foreignFeeTypeWatch = useWatch({ control, name: "foreignFeeType" });
    const spentAtWatch = useWatch({ control, name: "spentAt" });
    const isEdit = Boolean(editingItem?._id);

    const { data: categoriesData, isLoading: categoriesLoading } = useGetCategories({
        page: 1,
        limit: 100,
    });
    const { data: sourcesData, isLoading: sourcesLoading } = useGetSourcesOfMoney({
        page: 1,
        limit: 100,
    });
    const { data: suggestionsData } = useGetExpenseSuggestions(modalOpen);
    const suggestions = suggestionsData?.data;

    const sources = sourcesData?.data?.items ?? [];
    const selectedSource = useMemo(
        () => sources.find((item) => item._id === selectedSourceId) ?? null,
        [sources, selectedSourceId],
    );

    const remaining = useMemo(() => {
        const base = getSourceRemaining(selectedSource);
        if (base == null) return null;
        // When editing same source, current expense amount is already deducted — add it back for display
        if (
            editingItem &&
            getRefId(editingItem.sourceOfMoneyId) === selectedSourceId
        ) {
            return base + editingItem.amount;
        }
        return base;
    }, [selectedSource, editingItem, selectedSourceId]);


    // Phí giao dịch quốc tế: chỉ khi tạo, trên thẻ có cấu hình phí loại đó
    const foreignFeeOptions = useMemo(() => {
        if (isEdit || selectedSource?.type !== SourcesOfMoneyType.CREDIT_CARD) return [];
        return Object.values(ForeignFeeType).flatMap((type) => {
            const config = getForeignFeeConfig(selectedSource.creditDetails, type);
            if (!config) return [];
            const parts = [
                config.percent ? `${config.percent}%` : null,
                config.min ? `tối thiểu ${formatMoney(config.min)}` : null,
            ].filter(Boolean);
            return [{ value: type, label: `${FOREIGN_FEE_TYPE_LABELS[type]} (${parts.join(", ")})` }];
        });
    }, [isEdit, selectedSource]);
    const foreignFeeConfig =
        foreignFeeTypeWatch && selectedSource
            ? getForeignFeeConfig(selectedSource.creditDetails, foreignFeeTypeWatch)
            : null;
    const foreignFeeAmount = foreignFeeConfig
        ? calcPercentFee(Number(amountWatch) || 0, foreignFeeConfig.percent, foreignFeeConfig.min)
        : 0;

    // Đổi sang nguồn không có loại phí đang chọn thì bỏ chọn
    useEffect(() => {
        if (
            foreignFeeTypeWatch &&
            !foreignFeeOptions.some((option) => option.value === foreignFeeTypeWatch)
        ) {
            setValue("foreignFeeType", null);
        }
    }, [foreignFeeTypeWatch, foreignFeeOptions, setValue]);

    const expenseCategories = useMemo(
        () =>
            filterCategoriesByKind(
                categoriesData?.data?.items ?? [],
                CategoryKind.EXPENSE,
                editingItem ? getRefId(editingItem.categoryId) : undefined,
            ),
        [categoriesData, editingItem],
    );

    const categoryOptions = groupSuggestedOptions(
        appendCurrentOption(
            expenseCategories.map((item) => ({
                value: item._id,
                label: item.name,
            })),
            editingItem ? getExpenseCategory(editingItem) : null,
        ),
        suggestions?.categoryIds,
    );

    const sourceOptions = groupSuggestedOptions(
        appendCurrentOption(
            sources.map((item) => ({
                value: item._id,
                label: `${item.name} (${SOURCES_OF_MONEY_TYPE_LABELS[item.type]})`,
            })),
            editingItem ? getExpenseSource(editingItem) : null,
        ),
        suggestions?.sourceIds,
    );

    // Đã chọn danh mục thì chỉ gợi ý số tiền của danh mục đó
    const amountSuggestions = selectedCategoryId
        ? suggestions?.byCategory[selectedCategoryId]?.amounts
        : suggestions?.topAmounts;

    const handleCategoryChange = (categoryId?: string) => {
        if (isEdit || !categoryId || getValues("sourceOfMoneyId")) return;
        const suggestedSourceId = suggestions?.byCategory[categoryId]?.sourceId;
        if (suggestedSourceId && sources.some((item) => item._id === suggestedSourceId)) {
            setValue("sourceOfMoneyId", suggestedSourceId);
            clearErrors("sourceOfMoneyId");
        }
    };

    const handleAmountSuggestion = (amount: number) => {
        setValue("amount", String(amount));
        clearErrors("amount");
    };

    // Chip "thường dùng": tối đa 5 danh mục, 3 nguồn theo gợi ý (chỉ những mục còn chọn được)
    const categoryChips = useMemo(() => {
        const nameById = new Map(
            expenseCategories.map((item) => [item._id, item.icon ? `${item.icon} ${item.name}` : item.name]),
        );
        return (suggestions?.categoryIds ?? [])
            .filter((id) => nameById.has(id))
            .slice(0, 5)
            .map((id) => ({ value: id, label: nameById.get(id) as string }));
    }, [expenseCategories, suggestions?.categoryIds]);

    const sourceChips = useMemo(
        () =>
            (suggestions?.sourceIds ?? [])
                .map((id) => sources.find((item) => item._id === id))
                .filter((item): item is NonNullable<typeof item> => Boolean(item))
                .slice(0, 3)
                .map((item) => ({
                    value: item._id,
                    label: item.name,
                    hint:
                        item.type === SourcesOfMoneyType.CREDIT_CARD
                            ? `còn ${formatMoney(getSourceRemaining(item))}`
                            : formatMoney(getSourceRemaining(item)),
                })),
        [sources, suggestions?.sourceIds],
    );

    const selectCategory = (categoryId: string) => {
        setValue("categoryId", categoryId);
        clearErrors("categoryId");
        handleCategoryChange(categoryId);
    };

    const selectSource = (sourceId: string) => {
        setValue("sourceOfMoneyId", sourceId);
        clearErrors("sourceOfMoneyId");
    };

    useEffect(() => {
        if (!modalOpen) {
            setKeepCreating(false);
            return;
        }

        if (editingItem) {
            reset({
                categoryId: getRefId(editingItem.categoryId),
                sourceOfMoneyId: getRefId(editingItem.sourceOfMoneyId),
                amount: editingItem.amount,
                note: editingItem.note ?? "",
                spentAt: editingItem.spentAt ? dayjs(editingItem.spentAt) : dayjs(),
                foreignFeeType: null,
            });
        } else {
            reset({
                ...createEmptyValues(),
                sourceOfMoneyId: createDefaults?.sourceOfMoneyId ?? "",
                amount: createDefaults?.amount != null ? String(createDefaults.amount) : "",
                note: createDefaults?.note ?? "",
            });
        }
    }, [modalOpen, editingItem, createDefaults, reset]);

    const onValid = async (values: FormValues) => {
        const amount = Number(values.amount);
        if (!Number.isFinite(amount) || amount <= 0) {
            setError("amount", { message: "Số tiền phải lớn hơn 0" });
            return;
        }

        const payload: IFromExpensesData = {
            categoryId: values.categoryId,
            sourceOfMoneyId: values.sourceOfMoneyId,
            amount,
            note: values.note.trim() || "",
            spentAt: values.spentAt.toISOString(),
        };
        // Chỉ đánh dấu phí thẻ khi vẫn ghi trên đúng thẻ được mở từ dashboard
        if (
            !isEdit &&
            createDefaults?.cardFeeType &&
            values.sourceOfMoneyId === createDefaults.sourceOfMoneyId
        ) {
            payload.cardFeeType = createDefaults.cardFeeType;
        } else if (!isEdit && values.foreignFeeType) {
            payload.foreignFeeType = values.foreignFeeType;
        }

        const shouldKeepOpen = !isEdit && keepCreating;
        const success = await submitExpense(payload, { keepOpen: shouldKeepOpen });
        if (success && shouldKeepOpen) {
            // Giữ lại ngày đã chọn để nhập nhanh nhiều khoản trong cùng ngày
            reset({ ...createEmptyValues(), spentAt: values.spentAt });
            focusModalField();
        }
    };

    const handleOk = () => {
        void handleSubmit(onValid)();
    };

    useSubmitShortcut(handleOk, modalOpen);

    return (
        <ResponsiveModal
            title={isEdit ? "Sửa chi tiêu" : <TransactionTypeSwitch value="expense" />}
            open={modalOpen}
            onCancel={closeModal}
            onOk={handleOk}
            confirmLoading={isSubmitting}
            destroyOnHidden
            okText={isEdit ? "Cập nhật" : "Tạo mới"}
            cancelText="Hủy"
            width={520}
            footer={(_, { OkBtn, CancelBtn }) => (
                <div className="flex items-center justify-end gap-3">
                    {!isEdit ? (
                        <label className="mr-auto flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
                            <Switch
                                size="sm"
                                checked={keepCreating}
                                onCheckedChange={setKeepCreating}
                            />
                            Tạo tiếp
                        </label>
                    ) : null}
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
                        >
                            <AmountInput
                                value={field.value}
                                onChange={field.onChange}
                                defaultKeypadOpen={!isEdit}
                            />
                            {/* Chip gợi ý là khối (div) nên đặt trong thân field thay vì `extra` */}
                            <AmountSuggestionChips
                                amounts={amountSuggestions}
                                value={field.value}
                                onSelect={handleAmountSuggestion}
                            />
                        </FormField>
                    )}
                />

                <FormField label="Danh mục" error={errors.categoryId?.message}>
                    <div className="flex flex-col gap-2">
                        <ChoiceChips
                            label="Thường dùng:"
                            options={categoryChips}
                            value={selectedCategoryId}
                            onChange={selectCategory}
                        />
                        <Controller
                            name="categoryId"
                            control={control}
                            rules={{ required: "Danh mục là bắt buộc" }}
                            render={({ field }) => (
                                <Combobox
                                    value={field.value}
                                    onChange={(value) => {
                                        field.onChange(value ?? "");
                                        handleCategoryChange(value);
                                    }}
                                    options={categoryOptions}
                                    placeholder={categoryChips.length ? "Hoặc chọn danh mục khác" : "Chọn danh mục"}
                                    loading={categoriesLoading}
                                />
                            )}
                        />
                    </div>
                </FormField>

                <FormField
                    label="Nguồn tiền"
                    error={errors.sourceOfMoneyId?.message}
                    extra={
                        selectedSource ? (
                            <span className="money-value">
                                {selectedSource.type === SourcesOfMoneyType.CREDIT_CARD
                                    ? `Hạn mức còn lại: ${formatMoney(remaining)}`
                                    : `Số dư hiện có: ${formatMoney(remaining)}`}
                            </span>
                        ) : undefined
                    }
                >
                    <div className="flex flex-col gap-2">
                        <ChoiceChips
                            label="Thường dùng:"
                            options={sourceChips}
                            value={selectedSourceId}
                            onChange={selectSource}
                        />
                        <Controller
                            name="sourceOfMoneyId"
                            control={control}
                            rules={{ required: "Nguồn tiền là bắt buộc" }}
                            render={({ field }) => (
                                <Combobox
                                    value={field.value}
                                    onChange={(value) => field.onChange(value ?? "")}
                                    options={sourceOptions}
                                    placeholder={sourceChips.length ? "Hoặc chọn nguồn khác" : "Chọn nguồn tiền"}
                                    loading={sourcesLoading}
                                />
                            )}
                        />
                    </div>
                </FormField>

                {/* Ghi chính khoản phí thẻ thì không tính là chi tiêu của kỳ */}
                {!isEdit && !createDefaults?.cardFeeType ? (
                    <CardUsageFeeAlert source={selectedSource} date={spentAtWatch} />
                ) : null}

                {foreignFeeOptions.length > 0 && !createDefaults?.cardFeeType ? (
                    <Controller
                        name="foreignFeeType"
                        control={control}
                        render={({ field, fieldState }) => (
                            <FormField
                                label="Giao dịch quốc tế"
                                error={fieldState.error?.message}
                                extra={
                                    foreignFeeAmount > 0
                                        ? `Ghi thêm khoản phí ~${formatMoney(foreignFeeAmount)} trên thẻ (cùng danh mục)`
                                        : "Chọn nếu thanh toán bằng ngoại tệ hoặc tại đơn vị nước ngoài"
                                }
                            >
                                <Combobox
                                    value={field.value}
                                    onChange={(value) => field.onChange(value ?? null)}
                                    options={foreignFeeOptions}
                                    placeholder="Không"
                                    allowClear
                                />
                            </FormField>
                        )}
                    />
                ) : null}

                <Controller
                    name="spentAt"
                    control={control}
                    rules={{ required: "Ngày chi là bắt buộc" }}
                    render={({ field, fieldState }) => (
                        <FormField label="Ngày chi" error={fieldState.error?.message}>
                            <QuickDateField value={field.value} onChange={field.onChange} />
                        </FormField>
                    )}
                />

                <Controller
                    name="note"
                    control={control}
                    render={({ field, fieldState }) => {
                        const note = field.value ?? "";
                        return (
                            <FormField label="Ghi chú" htmlFor={noteId} error={fieldState.error?.message}>
                                <div className="flex flex-col gap-1">
                                    <Textarea
                                        {...field}
                                        value={note}
                                        id={noteId}
                                        rows={2}
                                        maxLength={NOTE_MAX_LENGTH}
                                        placeholder="Ghi chú (không bắt buộc)"
                                        aria-invalid={fieldState.invalid || undefined}
                                    />
                                    <span className="text-right text-xs text-muted-foreground">
                                        {note.length}/{NOTE_MAX_LENGTH}
                                    </span>
                                </div>
                            </FormField>
                        );
                    }}
                />
            </div>
        </ResponsiveModal>
    );
}
