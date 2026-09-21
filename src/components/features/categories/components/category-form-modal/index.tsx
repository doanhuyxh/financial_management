"use client";

import { useEffect } from "react";
import { Form, Input, Modal } from "antd";
import type { ICategoriesData } from "@/libs/interfaces/categoriesData";

type CategoryFormModalProps = {
    open: boolean;
    loading?: boolean;
    initialValues?: ICategoriesData | null;
    onCancel: () => void;
    onSubmit: (values: { name: string }) => void;
};

export default function CategoryFormModal({
    open,
    loading = false,
    initialValues,
    onCancel,
    onSubmit,
}: CategoryFormModalProps) {
    const [form] = Form.useForm<{ name: string }>();
    const isEdit = Boolean(initialValues?._id);

    useEffect(() => {
        if (!open) return;
        if (initialValues) {
            form.setFieldsValue({ name: initialValues.name });
        } else {
            form.resetFields();
        }
    }, [open, initialValues, form]);

    const handleOk = async () => {
        const values = await form.validateFields();
        onSubmit({ name: values.name.trim() });
    };

    return (
        <Modal
            title={isEdit ? "Sửa danh mục" : "Thêm danh mục"}
            open={open}
            onCancel={onCancel}
            onOk={handleOk}
            confirmLoading={loading}
            destroyOnHidden
            okText={isEdit ? "Cập nhật" : "Tạo mới"}
            cancelText="Hủy"
        >
            <Form form={form} layout="vertical" className="mt-4">
                <Form.Item
                    name="name"
                    label="Tên danh mục"
                    rules={[
                        { required: true, message: "Tên danh mục là bắt buộc" },
                        { max: 100, message: "Tên danh mục tối đa 100 ký tự" },
                    ]}
                >
                    <Input
                        placeholder="Ví dụ: Ăn uống, Đi lại..."
                        maxLength={100}
                        autoFocus
                        onPressEnter={handleOk}
                    />
                </Form.Item>
            </Form>
        </Modal>
    );
}
