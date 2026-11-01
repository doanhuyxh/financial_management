"use client";

import { useEffect, useMemo, useState } from "react";
import { DatePicker, Form, Input, Select, Switch } from "antd";
import ResponsiveModal from "@/components/common/responsive-modal";
import dayjs from "dayjs";
import DebouncedNumberInput from "@/components/common/input/DebouncedNumberInput";
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

    const categoryOptions = groupSuggestedOptions(
        appendCurrentOption(
            filterCategoriesByKind(
                categoriesData?.data?.items ?? [],
                CategoryKind.INCOME,
                editingItem ? getRefId(editingItem.categoryId) : undefined,
            ).map((item) => ({
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
        }
    };

    return (
        <ResponsiveModal
            title={isEdit ? "Sửa thu nhập" : "Thêm thu nhập"}
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
            <Form form={form} layout="vertical" className="mt-4">
                <Form.Item
                    name="receivedAt"
                    label="Ngày thu"
                    rules={[{ required: true, message: "Ngày thu là bắt buộc" }]}
                >
                    <DatePicker inputReadOnly className="w-full" format="DD/MM/YYYY" />
                </Form.Item>

                <Form.Item
                    name="categoryId"
                    label="Danh mục"
                    rules={[{ required: true, message: "Danh mục là bắt buộc" }]}
                >
                    <Select
                        showSearch
                        optionFilterProp="label"
                        placeholder="Chọn danh mục"
                        loading={categoriesLoading}
                        options={categoryOptions}
                        onChange={handleCategoryChange}
                    />
                </Form.Item>

                <Form.Item
                    name="sourceOfMoneyId"
                    label="Nguồn tiền"
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
                    extra={
                        selectedSource
                            ? `Số dư hiện có: ${formatMoney(displayAmount)} (thu nhập sẽ tăng số dư)`
                            : undefined
                    }
                >
                    <Select
                        showSearch
                        optionFilterProp="label"
                        placeholder="Chọn nguồn tiền"
                        loading={sourcesLoading}
                        options={sourceOptions}
                    />
                </Form.Item>

                <Form.Item
                    name="amount"
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
                    <DebouncedNumberInput min={0} placeholder="0" delay={300} />
                </Form.Item>

                <Form.Item name="note" label="Ghi chú">
                    <Input.TextArea
                        rows={3}
                        maxLength={500}
                        placeholder="Ghi chú (không bắt buộc)"
                        showCount
                    />
                </Form.Item>
            </Form>
        </ResponsiveModal>
    );
}
