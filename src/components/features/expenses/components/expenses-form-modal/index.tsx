"use client";

import { useEffect, useMemo } from "react";
import { DatePicker, Form, Input, Modal, Select } from "antd";
import dayjs from "dayjs";
import DebouncedNumberInput from "@/components/common/input/DebouncedNumberInput";
import { useExpensesContext } from "@/components/features/expenses/context";
import { formatMoney, getRefId } from "@/components/features/expenses/utils";
import { useGetCategories } from "@/libs/hooks/customHooks/useCategories";
import { useGetSourcesOfMoney } from "@/libs/hooks/customHooks/useSourcesOfMoney";
import type { IFromExpensesData } from "@/libs/interfaces/expensesData";
import {
    SOURCES_OF_MONEY_TYPE_LABELS,
    SourcesOfMoneyType,
    type ISourcesOfMoneyData,
} from "@/libs/interfaces/sourcesOfMoneyData";

type FormValues = {
    categoryId: string;
    sourceOfMoneyId: string;
    amount: string | number | null;
    note?: string;
    spentAt: dayjs.Dayjs;
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

export default function ExpensesFormModal() {
    const { modalOpen, editingItem, isSubmitting, closeModal, handleSubmit } =
        useExpensesContext();

    const [form] = Form.useForm<FormValues>();
    const selectedSourceId = Form.useWatch("sourceOfMoneyId", form);
    const isEdit = Boolean(editingItem?._id);

    const { data: categoriesData, isLoading: categoriesLoading } = useGetCategories({
        page: 1,
        limit: 100,
    });
    const { data: sourcesData, isLoading: sourcesLoading } = useGetSourcesOfMoney({
        page: 1,
        limit: 100,
    });

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


    const categoryOptions = (categoriesData?.data?.items ?? []).map((item) => ({
        value: item._id,
        label: item.name,
    }));

    const sourceOptions = sources.map((item) => ({
        value: item._id,
        label: `${item.name} (${SOURCES_OF_MONEY_TYPE_LABELS[item.type]})`,
    }));

    useEffect(() => {
        if (!modalOpen) return;

        if (editingItem) {
            form.setFieldsValue({
                categoryId: getRefId(editingItem.categoryId),
                sourceOfMoneyId: getRefId(editingItem.sourceOfMoneyId),
                amount: editingItem.amount,
                note: editingItem.note ?? "",
                spentAt: editingItem.spentAt ? dayjs(editingItem.spentAt) : dayjs(),
            });
        } else {
            form.resetFields();
            form.setFieldsValue({
                spentAt: dayjs(),
                amount: "",
                note: "",
            });
        }
    }, [modalOpen, editingItem, form]);

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

        await handleSubmit(payload);
    };

    return (
        <Modal
            title={isEdit ? "Sửa chi tiêu" : "Thêm chi tiêu"}
            open={modalOpen}
            onCancel={closeModal}
            onOk={handleOk}
            confirmLoading={isSubmitting}
            destroyOnHidden
            okText={isEdit ? "Cập nhật" : "Tạo mới"}
            cancelText="Hủy"
            width={520}
        >
            <Form form={form} layout="vertical" className="mt-4">
                <Form.Item
                    name="spentAt"
                    label="Ngày chi"
                    rules={[{ required: true, message: "Ngày chi là bắt buộc" }]}
                >
                    <DatePicker className="w-full" format="DD/MM/YYYY" />
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
                    />
                </Form.Item>

                <Form.Item
                    name="sourceOfMoneyId"
                    label="Nguồn tiền"
                    rules={[{ required: true, message: "Nguồn tiền là bắt buộc" }]}
                    extra={
                        selectedSource
                            ? selectedSource.type === SourcesOfMoneyType.CREDIT_CARD
                                ? `Hạn mức còn lại: ${formatMoney(remaining)}`
                                : `Số dư hiện có: ${formatMoney(remaining)}`
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
        </Modal>
    );
}
