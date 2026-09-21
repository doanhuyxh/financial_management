"use client";

import { useEffect } from "react";
import { Form, Input, Modal } from "antd";
import { useCategoryContext } from "@/components/features/categories/context";

export default function CategoryFormModal() {
    const {
        modalOpen,
        editingCategory,
        isSubmitting,
        closeModal,
        handleSubmit,
    } = useCategoryContext();

    const [form] = Form.useForm<{ name: string }>();
    const isEdit = Boolean(editingCategory?._id);

    useEffect(() => {
        if (!modalOpen) return;
        if (editingCategory) {
            form.setFieldsValue({ name: editingCategory.name });
        } else {
            form.resetFields();
        }
    }, [modalOpen, editingCategory, form]);

    const handleOk = async () => {
        const values = await form.validateFields();
        await handleSubmit({ name: values.name.trim() });
    };

    return (
        <Modal
            title={isEdit ? "Sửa danh mục" : "Thêm danh mục"}
            open={modalOpen}
            onCancel={closeModal}
            onOk={handleOk}
            confirmLoading={isSubmitting}
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
