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
import { useIncomesContext } from "@/components/features/incomes/context";
import {
    formatMoney,
    getIncomeCategory,
    getIncomeSource,
    getRefId,
} from "@/components/features/incomes/utils";
import { appendCurrentOption } from "@/libs/utils/archivedRef";
import { useGetCategories } from "@/libs/hooks/customHooks/useCategories";
import { CategoryKind } from "@/libs/interfaces/categoriesData";
import { filterCategoriesByKind } from "@/libs/utils/categoryKind";
import { useGetIncomeSuggestions } from "@/libs/hooks/customHooks/useIncomes";
import { useGetSourcesOfMoney } from "@/libs/hooks/customHooks/useSourcesOfMoney";
import type { IFromIncomesData } from "@/libs/interfaces/incomesData";
import {
    SOURCES_OF_MONEY_TYPE_LABELS,
    SourcesOfMoneyType,
} from "@/libs/interfaces/sourcesOfMoneyData";
import { groupSuggestedOptions } from "@/libs/utils/suggestionOptions";

type FormValues = {
    categoryId: string;
    sourceOfMoneyId: string;
    amount: string | number | null;
    note: string;
    receivedAt: dayjs.Dayjs;
};

const NOTE_MAX_LENGTH = 500;

const CREDIT_CARD_SOURCE_MESSAGE =
    "Không ghi thu nhập vào thẻ tín dụng. Hãy dùng Chuyển tiền để trả nợ thẻ";

/** Giá trị form tạo mới: trống, ngày thu = hôm nay. */
function createEmptyValues(): FormValues {
    return {
        categoryId: "",
        sourceOfMoneyId: "",
        amount: "",
        note: "",
        receivedAt: dayjs(),
    };
}

export default function IncomesFormModal() {
    const { modalOpen, editingItem, isSubmitting, closeModal, handleSubmit: submitIncome } =
        useIncomesContext();

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
    const isEdit = Boolean(editingItem?._id);

    const { data: categoriesData, isLoading: categoriesLoading } = useGetCategories({
        page: 1,
        limit: 100,
    });
    const { data: sourcesData, isLoading: sourcesLoading } = useGetSourcesOfMoney({
        page: 1,
        limit: 100,
    });
    const { data: suggestionsData } = useGetIncomeSuggestions(modalOpen);
    const suggestions = suggestionsData?.data;

    // Thu nhập không được ghi vào thẻ tín dụng; trả nợ thẻ đi qua Chuyển tiền
    const allSources = sourcesData?.data?.items ?? [];
    const sources = allSources.filter((item) => item.type !== SourcesOfMoneyType.CREDIT_CARD);
    const selectedSource = useMemo(
        () => sources.find((item) => item._id === selectedSourceId) ?? null,
        [sources, selectedSourceId],
    );

    const displayAmount = useMemo(() => {
        if (!selectedSource) return null;
        const base = selectedSource.balance ?? 0;
        // When editing same source, income already increased balance — subtract it back for display
        if (
            editingItem &&
            getRefId(editingItem.sourceOfMoneyId) === selectedSourceId
        ) {
            return Math.max(0, base - editingItem.amount);
        }
        return base;
    }, [selectedSource, editingItem, selectedSourceId]);

    const incomeCategories = useMemo(
        () =>
            filterCategoriesByKind(
                categoriesData?.data?.items ?? [],
                CategoryKind.INCOME,
                editingItem ? getRefId(editingItem.categoryId) : undefined,
            ),
        [categoriesData, editingItem],
    );

    const categoryOptions = groupSuggestedOptions(
        appendCurrentOption(
            incomeCategories.map((item) => ({
                value: item._id,
                label: item.name,
            })),
            editingItem ? getIncomeCategory(editingItem) : null,
        ),
        suggestions?.categoryIds,
    );

    const sourceOptions = groupSuggestedOptions(
        appendCurrentOption(
            sources.map((item) => ({
                value: item._id,
                label: `${item.name} (${SOURCES_OF_MONEY_TYPE_LABELS[item.type]})`,
            })),
            editingItem ? getIncomeSource(editingItem) : null,
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
            incomeCategories.map((item) => [item._id, item.icon ? `${item.icon} ${item.name}` : item.name]),
        );
        return (suggestions?.categoryIds ?? [])
            .filter((id) => nameById.has(id))
            .slice(0, 5)
            .map((id) => ({ value: id, label: nameById.get(id) as string }));
    }, [incomeCategories, suggestions?.categoryIds]);

    const sourceChips = useMemo(
        () =>
            (suggestions?.sourceIds ?? [])
                .map((id) => sources.find((item) => item._id === id))
                .filter((item): item is NonNullable<typeof item> => Boolean(item))
                .slice(0, 3)
                .map((item) => ({
                    value: item._id,
                    label: item.name,
                    hint: formatMoney(item.balance ?? 0),
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
                receivedAt: editingItem.receivedAt
                    ? dayjs(editingItem.receivedAt)
                    : dayjs(),
            });
        } else {
            reset(createEmptyValues());
        }
    }, [modalOpen, editingItem, reset]);

    const onValid = async (values: FormValues) => {
        const amount = Number(values.amount);
        if (!Number.isFinite(amount) || amount <= 0) {
            setError("amount", { message: "Số tiền phải lớn hơn 0" });
            return;
        }

        const payload: IFromIncomesData = {
            categoryId: values.categoryId,
            sourceOfMoneyId: values.sourceOfMoneyId,
            amount,
            note: values.note.trim() || "",
            receivedAt: values.receivedAt.toISOString(),
        };

        const shouldKeepOpen = !isEdit && keepCreating;
        const success = await submitIncome(payload, { keepOpen: shouldKeepOpen });
        if (success && shouldKeepOpen) {
            // Giữ lại ngày đã chọn để nhập nhanh nhiều khoản trong cùng ngày
            reset({ ...createEmptyValues(), receivedAt: values.receivedAt });
            focusModalField();
        }
    };

    const handleOk = () => {
        void handleSubmit(onValid)();
    };

    useSubmitShortcut(handleOk, modalOpen);

    return (
        <ResponsiveModal
            title={isEdit ? "Sửa thu nhập" : <TransactionTypeSwitch value="income" />}
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
                                Số dư hiện có: {formatMoney(displayAmount)} (thu nhập sẽ tăng số dư)
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
                            rules={{
                                required: "Nguồn tiền là bắt buộc",
                                // Thu nhập cũ đang gắn với thẻ: phải chọn nguồn khác mới lưu được
                                validate: (value) => {
                                    const source = allSources.find((item) => item._id === value);
                                    return source?.type === SourcesOfMoneyType.CREDIT_CARD
                                        ? CREDIT_CARD_SOURCE_MESSAGE
                                        : true;
                                },
                            }}
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

                <Controller
                    name="receivedAt"
                    control={control}
                    rules={{ required: "Ngày thu là bắt buộc" }}
                    render={({ field, fieldState }) => (
                        <FormField label="Ngày thu" error={fieldState.error?.message}>
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
