"use client";

import { useEffect, useId } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import ResponsiveModal, { MODAL_AUTOFOCUS_CLASS } from "@/components/common/responsive-modal";
import FormField from "@/components/common/form-field";
import Segmented from "@/components/common/segmented";
import { Input } from "@/components/shadcn/ui/input";
import { useCategoryContext } from "@/components/features/categories/context";
import { CATEGORY_KIND_LABELS, CategoryKind } from "@/libs/interfaces/categoriesData";
import { getCategoryColor } from "@/libs/utils/categoryColor";
import IconPicker from "@/components/features/categories/components/category-form-modal/components/icon-picker";
import ColorPicker from "@/components/features/categories/components/category-form-modal/components/color-picker";

type FormValues = {
    name: string;
    kind: CategoryKind;
    icon: string | null;
    color: string | null;
};

const NAME_MAX_LENGTH = 100;

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
        handleSubmit: submitCategory,
    } = useCategoryContext();

    const nameId = useId();
    const { control, handleSubmit, reset } = useForm<FormValues>({
        mode: "onChange",
        defaultValues: { name: "", kind: CategoryKind.EXPENSE, icon: null, color: null },
    });
    const isEdit = Boolean(editingCategory?._id);

    useEffect(() => {
        if (!modalOpen) return;
        if (editingCategory) {
            reset({
                name: editingCategory.name,
                kind: editingCategory.kind ?? CategoryKind.EXPENSE,
                icon: editingCategory.icon ?? null,
                color: editingCategory.color ?? null,
            });
        } else {
            // Tạo mới: mặc định theo tab đang xem
            reset({ name: "", kind: kindFilter, icon: null, color: null });
        }
    }, [modalOpen, editingCategory, kindFilter, reset]);

    const nameWatch = useWatch({ control, name: "name" });
    const iconWatch = useWatch({ control, name: "icon" });
    const colorWatch = useWatch({ control, name: "color" });
    const previewColor = getCategoryColor(editingCategory?._id ?? nameWatch, colorWatch);

    const handleOk = handleSubmit(async (values) => {
        await submitCategory({
            name: values.name.trim(),
            kind: values.kind,
            icon: values.icon || "",
            color: values.color || "",
        });
    });

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
            <div className="mt-4 flex flex-col gap-4">
                <Controller
                    name="kind"
                    control={control}
                    render={({ field }) => (
                        <FormField
                            label="Loại danh mục"
                            extra={
                                isEdit
                                    ? "Chỉ đổi được loại khi danh mục chưa có giao dịch"
                                    : undefined
                            }
                        >
                            <Segmented<CategoryKind>
                                block
                                options={KIND_OPTIONS}
                                value={field.value}
                                onChange={field.onChange}
                                aria-label="Loại danh mục"
                            />
                        </FormField>
                    )}
                />
                <Controller
                    name="name"
                    control={control}
                    rules={{
                        required: "Tên danh mục là bắt buộc",
                        maxLength: {
                            value: NAME_MAX_LENGTH,
                            message: `Tên danh mục tối đa ${NAME_MAX_LENGTH} ký tự`,
                        },
                    }}
                    render={({ field, fieldState }) => (
                        <FormField
                            label="Tên danh mục"
                            htmlFor={nameId}
                            className={MODAL_AUTOFOCUS_CLASS}
                            error={fieldState.error?.message}
                        >
                            <Input
                                {...field}
                                id={nameId}
                                placeholder="Ví dụ: Ăn uống, Đi lại..."
                                maxLength={NAME_MAX_LENGTH}
                                aria-invalid={fieldState.invalid || undefined}
                                onKeyDown={(event) => {
                                    // Enter = lưu (như onPressEnter cũ); bỏ qua khi đang gõ bộ gõ
                                    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
                                    event.preventDefault();
                                    void handleOk();
                                }}
                            />
                        </FormField>
                    )}
                />
                <Controller
                    name="icon"
                    control={control}
                    render={({ field }) => (
                        <FormField label="Icon">
                            <IconPicker value={field.value} onChange={field.onChange} />
                        </FormField>
                    )}
                />
                <Controller
                    name="color"
                    control={control}
                    render={({ field }) => (
                        <FormField label="Màu" extra="Dùng cho biểu đồ và danh sách giao dịch">
                            <ColorPicker value={field.value} onChange={field.onChange} />
                        </FormField>
                    )}
                />
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
            </div>
        </ResponsiveModal>
    );
}
