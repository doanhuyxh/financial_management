"use client";

import { useEffect } from "react";
import { Form, Select } from "antd";
import ResponsiveModal from "@/components/common/responsive-modal";
import DebouncedNumberInput from "@/components/common/input/DebouncedNumberInput";
import { useBudgetsContext } from "@/components/features/budgets/context";

type FormValues = {
    categoryId?: string;
    amount: string | number | null;
};

export default function BudgetFormModal() {
    const {
        modalOpen,
        editingItem,
        isSubmitting,
        categoryOptions,
        isCategoriesLoading,
        closeModal,
        handleSubmit,
    } = useBudgetsContext();

    const [form] = Form.useForm<FormValues>();
    const isEdit = Boolean(editingItem?._id);

    useEffect(() => {
        if (!modalOpen) return;
        if (editingItem) {
            form.setFieldsValue({ amount: editingItem.amount });
        } else {
            form.resetFields();
            form.setFieldsValue({ categoryId: categoryOptions[0]?.value, amount: "" });
        }
        // categoryOptions only seeds the default on open
    }, [modalOpen, editingItem, form]);

    const handleOk = async () => {
        const values = await form.validateFields();
        const amount = Number(values.amount);
        if (!Number.isFinite(amount) || amount <= 0) {
            form.setFields([{ name: "amount", errors: ["Hạn mức phải lớn hơn 0"] }]);
            return;
        }
        await handleSubmit({ categoryId: values.categoryId || null, amount });
    };

    return (
        <ResponsiveModal
            title={isEdit ? `Sửa ngân sách: ${editingItem?.categoryName}` : "Thêm ngân sách"}
            open={modalOpen}
            onCancel={closeModal}
            onOk={handleOk}
            confirmLoading={isSubmitting}
            destroyOnHidden
            okText={isEdit ? "Cập nhật" : "Tạo mới"}
            cancelText="Hủy"
        >
            <Form form={form} layout="vertical" className="mt-4">
                {!isEdit ? (
                    <Form.Item
                        name="categoryId"
                        label="Áp dụng cho"
                        extra="Chỉ hiện danh mục chi tiêu chưa có ngân sách"
                    >
                        <Select
                            showSearch
                            optionFilterProp="label"
                            loading={isCategoriesLoading}
                            options={categoryOptions}
                        />
                    </Form.Item>
                ) : null}
                <Form.Item
                    name="amount"
                    label="Hạn mức mỗi tháng"
                    rules={[{ required: true, message: "Hạn mức là bắt buộc" }]}
                >
                    <DebouncedNumberInput min={0} step={100000} placeholder="0" delay={300} />
                </Form.Item>
            </Form>
        </ResponsiveModal>
    );
}
