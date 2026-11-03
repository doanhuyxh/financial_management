"use client";

import { useEffect, useMemo, useState } from "react";
import { Form, Input, Select, Switch } from "antd";
import ResponsiveModal, {
    MODAL_AUTOFOCUS_CLASS,
    focusModalField,
} from "@/components/common/responsive-modal";
import ChoiceChips from "@/components/common/choice-chips";
import QuickDateField from "@/components/common/quick-date-field";
import TransactionTypeSwitch from "@/components/common/transaction-type-switch";
import { useSubmitShortcut } from "@/libs/hooks/useHotkey";
import dayjs from "dayjs";
import DebouncedNumberInput, {
    LARGE_AMOUNT_INPUT_CLASS,
} from "@/components/common/input/DebouncedNumberInput";
import AmountSuggestionChips from "@/components/common/amount-suggestion-chips";
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
    note?: string;
    spentAt: dayjs.Dayjs;
    foreignFeeType?: ForeignFeeType | null;
};

function getSourceRemaining(source?: ISourcesOfMoneyData | null) {
    if (!source) return null;
    if (source.type === SourcesOfMoneyType.CREDIT_CARD) {
        const limit = source.creditDetails?.creditLimit ?? 0;
        const debt = source.creditDetails?.currentDebt ?? 0;
        return Math.max(0, limit - debt);
    }
    return source.balance ?? 0;
}

function resetCreateForm(form: ReturnType<typeof Form.useForm<FormValues>>[0]) {
    form.resetFields();
    form.setFieldsValue({
        spentAt: dayjs(),
        amount: "",
        note: "",
    });
}

export default function ExpensesFormModal() {
    const { modalOpen, editingItem, createDefaults, isSubmitting, closeModal, handleSubmit } =
        useExpensesContext();

    const [form] = Form.useForm<FormValues>();
    const [keepCreating, setKeepCreating] = useState(false);
    const selectedSourceId = Form.useWatch("sourceOfMoneyId", form);
    const selectedCategoryId = Form.useWatch("categoryId", form);
    const amountWatch = Form.useWatch("amount", form);
    const foreignFeeTypeWatch = Form.useWatch("foreignFeeType", form);
    const spentAtWatch = Form.useWatch("spentAt", form);
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
            form.setFieldValue("foreignFeeType", null);
        }
    }, [foreignFeeTypeWatch, foreignFeeOptions, form]);

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
        if (isEdit || !categoryId || form.getFieldValue("sourceOfMoneyId")) return;
        const suggestedSourceId = suggestions?.byCategory[categoryId]?.sourceId;
        if (suggestedSourceId && sources.some((item) => item._id === suggestedSourceId)) {
            form.setFieldValue("sourceOfMoneyId", suggestedSourceId);
        }
    };

    const handleAmountSuggestion = (amount: number) => {
        form.setFields([{ name: "amount", value: String(amount), errors: [] }]);
    };

    // Chip "thường dùng": tối đa 5 danh mục, 3 nguồn theo gợi ý (chỉ những mục còn chọn được)
    const categoryChips = useMemo(() => {
        const nameById = new Map(expenseCategories.map((item) => [item._id, item.name]));
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
        form.setFields([{ name: "categoryId", value: categoryId, errors: [] }]);
        handleCategoryChange(categoryId);
    };

    const selectSource = (sourceId: string) => {
        form.setFields([{ name: "sourceOfMoneyId", value: sourceId, errors: [] }]);
    };

    useEffect(() => {
        if (!modalOpen) {
            setKeepCreating(false);
            return;
        }

        if (editingItem) {
            form.setFieldsValue({
                categoryId: getRefId(editingItem.categoryId),
                sourceOfMoneyId: getRefId(editingItem.sourceOfMoneyId),
                amount: editingItem.amount,
                note: editingItem.note ?? "",
                spentAt: editingItem.spentAt ? dayjs(editingItem.spentAt) : dayjs(),
            });
        } else {
            resetCreateForm(form);
            if (createDefaults) {
                form.setFieldsValue({
                    sourceOfMoneyId: createDefaults.sourceOfMoneyId,
                    amount: createDefaults.amount != null ? String(createDefaults.amount) : "",
                    note: createDefaults.note ?? "",
                });
            }
        }
    }, [modalOpen, editingItem, createDefaults, form]);

    const handleOk = async () => {
        const values = await form.validateFields();
        const amount = Number(values.amount);
        if (!Number.isFinite(amount) || amount <= 0) {
            form.setFields([{ name: "amount", errors: ["Số tiền phải lớn hơn 0"] }]);
            return;
        }

        const payload: IFromExpensesData = {
            categoryId: values.categoryId,
            sourceOfMoneyId: values.sourceOfMoneyId,
            amount,
            note: values.note?.trim() || "",
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
        const success = await handleSubmit(payload, { keepOpen: shouldKeepOpen });
        if (success && shouldKeepOpen) {
            // Giữ lại ngày đã chọn để nhập nhanh nhiều khoản trong cùng ngày
            form.resetFields(["categoryId", "sourceOfMoneyId", "amount", "note", "foreignFeeType"]);
            form.setFieldsValue({ amount: "", note: "" });
            focusModalField();
        }
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
                <div className="flex flex-col-reverse gap-2 md:flex-row md:items-center md:justify-between">
                    {!isEdit ? (
                        <label className="flex items-center gap-2 text-sm text-neutral-600">
                            <Switch
                                size="small"
                                checked={keepCreating}
                                onChange={setKeepCreating}
                            />
                            Tạo tiếp
                        </label>
                    ) : (
                        <span />
                    )}
                    <div className="flex flex-col-reverse gap-2 md:flex-row md:items-center">
                        <CancelBtn />
                        <OkBtn />
                    </div>
                </div>
            )}
        >
            <Form form={form} layout="vertical" className="mt-4" requiredMark={false}>
                <Form.Item
                    name="amount"
                    className={MODAL_AUTOFOCUS_CLASS}
                    label="Số tiền"
                    rules={[{ required: true, message: "Số tiền là bắt buộc" }]}
                    extra={
                        <AmountSuggestionChips
                            amounts={amountSuggestions}
                            value={amountWatch}
                            onSelect={handleAmountSuggestion}
                        />
                    }
                >
                    <DebouncedNumberInput
                        min={0}
                        placeholder="0"
                        delay={300}
                        size="large"
                        suffix="₫"
                        className={LARGE_AMOUNT_INPUT_CLASS}
                    />
                </Form.Item>

                <Form.Item label="Danh mục" required>
                    <div className="flex flex-col gap-2">
                        <ChoiceChips
                            label="Thường dùng:"
                            options={categoryChips}
                            value={selectedCategoryId}
                            onChange={selectCategory}
                        />
                        <Form.Item
                            name="categoryId"
                            noStyle
                            rules={[{ required: true, message: "Danh mục là bắt buộc" }]}
                        >
                            <Select
                                showSearch
                                optionFilterProp="label"
                                placeholder={categoryChips.length ? "Hoặc chọn danh mục khác" : "Chọn danh mục"}
                                loading={categoriesLoading}
                                options={categoryOptions}
                                onChange={handleCategoryChange}
                            />
                        </Form.Item>
                    </div>
                </Form.Item>

                <Form.Item
                    label="Nguồn tiền"
                    required
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
                        <Form.Item
                            name="sourceOfMoneyId"
                            noStyle
                            rules={[{ required: true, message: "Nguồn tiền là bắt buộc" }]}
                        >
                            <Select
                                showSearch
                                optionFilterProp="label"
                                placeholder={sourceChips.length ? "Hoặc chọn nguồn khác" : "Chọn nguồn tiền"}
                                loading={sourcesLoading}
                                options={sourceOptions}
                            />
                        </Form.Item>
                    </div>
                </Form.Item>

                {/* Ghi chính khoản phí thẻ thì không tính là chi tiêu của kỳ */}
                {!isEdit && !createDefaults?.cardFeeType ? (
                    <CardUsageFeeAlert source={selectedSource} date={spentAtWatch} />
                ) : null}

                {foreignFeeOptions.length > 0 && !createDefaults?.cardFeeType ? (
                    <Form.Item
                        name="foreignFeeType"
                        label="Giao dịch quốc tế"
                        extra={
                            foreignFeeAmount > 0
                                ? `Ghi thêm khoản phí ~${formatMoney(foreignFeeAmount)} trên thẻ (cùng danh mục)`
                                : "Chọn nếu thanh toán bằng ngoại tệ hoặc tại đơn vị nước ngoài"
                        }
                    >
                        <Select allowClear placeholder="Không" options={foreignFeeOptions} />
                    </Form.Item>
                ) : null}

                <Form.Item
                    name="spentAt"
                    label="Ngày chi"
                    rules={[{ required: true, message: "Ngày chi là bắt buộc" }]}
                >
                    <QuickDateField />
                </Form.Item>

                <Form.Item name="note" label="Ghi chú" className="mb-0">
                    <Input.TextArea
                        rows={2}
                        maxLength={500}
                        placeholder="Ghi chú (không bắt buộc)"
                        showCount
                    />
                </Form.Item>
            </Form>
        </ResponsiveModal>
    );
}
