"use client";

import { useEffect } from "react";
import { Form, Input, Segmented } from "antd";
import ResponsiveModal from "@/components/common/responsive-modal";
import { useCategoryContext } from "@/components/features/categories/context";
import { CATEGORY_KIND_LABELS, CategoryKind } from "@/libs/interfaces/categoriesData";
import { getCategoryColor } from "@/libs/utils/categoryColor";
import IconPicker from "@/components/features/categories/components/category-form-modal/components/icon-picker";
import ColorPicker from "@/components/features/categories/components/category-form-modal/components/color-picker";

type FormValues = {
    name: string;
    kind: CategoryKind;
    icon?: string | null;
    color?: string | null;
};

const KIND_OPTIONS = Object.values(CategoryKind).map((value) => ({
    value,
    label: CATEGORY_KIND_LABELS[value],
}));

export default function CategoryFormModal() {
    const {
        modalOpen,
        editingCategory,
        kindFilter,
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
                icon: editingCategory.icon ?? null,
                color: editingCategory.color ?? null,
            });
        } else {
            // Tạo mới: mặc định theo tab đang xem
            form.resetFields();
            form.setFieldsValue({ kind: kindFilter, icon: null, color: null });
        }
    }, [modalOpen, editingCategory, kindFilter, form]);

    const nameWatch = Form.useWatch("name", form);
    const iconWatch = Form.useWatch("icon", form);
    const colorWatch = Form.useWatch("color", form);
    const previewColor = getCategoryColor(editingCategory?._id ?? nameWatch, colorWatch);

    const handleOk = async () => {
        const values = await form.validateFields();
        await handleSubmit({
            name: values.name.trim(),
            kind: values.kind,
            icon: values.icon || "",
            color: values.color || "",
        });
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
                <Form.Item name="icon" label="Icon">
                    <IconPicker />
                </Form.Item>
                <Form.Item name="color" label="Màu" extra="Dùng cho biểu đồ và danh sách giao dịch">
                    <ColorPicker />
                </Form.Item>
                <div className="flex items-center gap-3 rounded-lg bg-muted px-3 py-2">
                    <span className="text-xs text-muted-foreground">Xem trước</span>
                    <span
                        aria-hidden
                        className="flex size-9 items-center justify-center rounded-lg text-base font-semibold"
                        style={{ backgroundColor: `${previewColor}1f`, color: previewColor }}
                    >
                        {iconWatch || (nameWatch?.trim()?.charAt(0).toUpperCase() ?? "") || "?"}
                    </span>
                    <span className="truncate font-medium">{nameWatch || "Tên danh mục"}</span>
                </div>
            </Form>
        </ResponsiveModal>
    );
}
