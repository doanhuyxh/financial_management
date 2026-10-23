"use client";

import { useEffect } from "react";
import { Form, Input, Segmented } from "antd";
import ResponsiveModal from "@/components/common/responsive-modal";
import { useCategoryContext } from "@/components/features/categories/context";
import { CATEGORY_KIND_LABELS, CategoryKind } from "@/libs/interfaces/categoriesData";

type FormValues = { name: string; kind: CategoryKind };

const KIND_OPTIONS = Object.values(CategoryKind).map((value) => ({
    value,
    label: CATEGORY_KIND_LABELS[value],
}));

export default function CategoryFormModal() {
    const {
        modalOpen,
        editingCategory,
        isSubmitting,
        closeModal,
        handleSubmit,
    } = useCategoryContext();

    const [form] = Form.useForm<FormValues>();
    const isEdit = Boolean(editingCategory?._id);

    useEffect(() => {
        if (!modalOpen) return;
        if (editingCategory) {
            form.setFieldsValue({
                name: editingCategory.name,
                kind: editingCategory.kind ?? CategoryKind.EXPENSE,
            });
        } else {
            form.resetFields();
        }
    }, [modalOpen, editingCategory, form]);

    const handleOk = async () => {
        const values = await form.validateFields();
        await handleSubmit({ name: values.name.trim(), kind: values.kind });
    };

    return (
        <ResponsiveModal
            title={isEdit ? "Sửa danh mục" : "Thêm danh mục"}
            open={modalOpen}
            onCancel={closeModal}
            onOk={handleOk}
            confirmLoading={isSubmitting}
            destroyOnHidden
            okText={isEdit ? "Cập nhật" : "Tạo mới"}
            cancelText="Hủy"
        >
            <Form
                form={form}
                layout="vertical"
                className="mt-4"
                initialValues={{ kind: CategoryKind.EXPENSE }}
            >
                <Form.Item
                    name="kind"
                    label="Loại danh mục"
                    extra={
                        isEdit
                            ? "Chỉ đổi được loại khi danh mục chưa có giao dịch"
                            : undefined
                    }
                >
                    <Segmented block options={KIND_OPTIONS} />
                </Form.Item>
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
        </ResponsiveModal>
    );
}
