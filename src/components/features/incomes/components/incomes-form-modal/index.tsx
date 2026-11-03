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
    note?: string;
    receivedAt: dayjs.Dayjs;
};

const CREDIT_CARD_SOURCE_MESSAGE =
    "Không ghi thu nhập vào thẻ tín dụng. Hãy dùng Chuyển tiền để trả nợ thẻ";

function resetCreateForm(form: ReturnType<typeof Form.useForm<FormValues>>[0]) {
    form.resetFields();
    form.setFieldsValue({
        receivedAt: dayjs(),
        amount: "",
        note: "",
    });
}

export default function IncomesFormModal() {
    const { modalOpen, editingItem, isSubmitting, closeModal, handleSubmit } =
        useIncomesContext();

    const [form] = Form.useForm<FormValues>();
    const [keepCreating, setKeepCreating] = useState(false);
    const selectedSourceId = Form.useWatch("sourceOfMoneyId", form);
    const selectedCategoryId = Form.useWatch("categoryId", form);
    const amountWatch = Form.useWatch("amount", form);
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
        const nameById = new Map(incomeCategories.map((item) => [item._id, item.name]));
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
                receivedAt: editingItem.receivedAt
                    ? dayjs(editingItem.receivedAt)
                    : dayjs(),
            });
        } else {
            resetCreateForm(form);
        }
    }, [modalOpen, editingItem, form]);

    const handleOk = async () => {
        const values = await form.validateFields();
        const amount = Number(values.amount);
        if (!Number.isFinite(amount) || amount <= 0) {
            form.setFields([{ name: "amount", errors: ["Số tiền phải lớn hơn 0"] }]);
            return;
        }

        const payload: IFromIncomesData = {
            categoryId: values.categoryId,
            sourceOfMoneyId: values.sourceOfMoneyId,
            amount,
            note: values.note?.trim() || "",
            receivedAt: values.receivedAt.toISOString(),
        };

        const shouldKeepOpen = !isEdit && keepCreating;
        const success = await handleSubmit(payload, { keepOpen: shouldKeepOpen });
        if (success && shouldKeepOpen) {
            // Giữ lại ngày đã chọn để nhập nhanh nhiều khoản trong cùng ngày
            form.resetFields(["categoryId", "sourceOfMoneyId", "amount", "note"]);
            form.setFieldsValue({ amount: "", note: "" });
            focusModalField();
        }
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
                        <Form.Item
                            name="sourceOfMoneyId"
                            noStyle
                            rules={[
                                { required: true, message: "Nguồn tiền là bắt buộc" },
                                {
                                    // Thu nhập cũ đang gắn với thẻ: phải chọn nguồn khác mới lưu được
                                    validator(_, value) {
                                        const source = allSources.find((item) => item._id === value);
                                        return source?.type === SourcesOfMoneyType.CREDIT_CARD
                                            ? Promise.reject(new Error(CREDIT_CARD_SOURCE_MESSAGE))
                                            : Promise.resolve();
                                    },
                                },
                            ]}
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

                <Form.Item
                    name="receivedAt"
                    label="Ngày thu"
                    rules={[{ required: true, message: "Ngày thu là bắt buộc" }]}
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
