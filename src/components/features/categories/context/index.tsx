"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAntdApp } from "@/libs/hooks/useAntdApp";
import {
    useCreateCategory,
    useDeleteCategory,
    useGetCategories,
    useReorderCategories,
    useUpdateCategory,
} from "@/libs/hooks/customHooks/useCategories";
import type { ICategoriesData } from "@/libs/interfaces/categoriesData";
import type { ICategoryContextProps } from "./type";

const LIST_LIMIT = 100;

interface ICategoryContextProviderProps {
    children: React.ReactNode;
}

const CategoryContext = createContext<ICategoryContextProps | undefined>(undefined);

function getErrorMessage(error: unknown, fallback: string) {
    if (error && typeof error === "object" && "message" in error) {
        return String((error as { message?: string }).message);
    }
    return fallback;
}

export default function CategoryContextProvider({ children }: ICategoryContextProviderProps) {
    const { notification, modal } = useAntdApp();

    const [search, setSearch] = useState("");
    const [localItems, setLocalItems] = useState<ICategoriesData[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<ICategoriesData | null>(null);

    const query = useMemo(
        () => ({
            page: 1,
            limit: LIST_LIMIT,
            search: search.trim() || undefined,
        }),
        [search],
    );

    const { data, isLoading, isFetching, isPlaceholderData } = useGetCategories(query);
    const { mutateAsync: createCategory, isPending: isCreating } = useCreateCategory();
    const { mutateAsync: updateCategory, isPending: isUpdating } = useUpdateCategory();
    const { mutateAsync: deleteCategory } = useDeleteCategory();
    const { mutateAsync: reorderCategories, isPending: isReordering } =
        useReorderCategories();

    useEffect(() => {
        setTimeout(() => {
            setLocalItems(data?.data?.items ?? []);
        }, 0);
    }, [data?.data?.items]);

    const handleSearch = useCallback((value: string) => {
        setSearch(value);
    }, []);

    const openCreateModal = useCallback(() => {
        setEditingCategory(null);
        setModalOpen(true);
    }, []);

    const openEditModal = useCallback((record: ICategoriesData) => {
        setEditingCategory(record);
        setModalOpen(true);
    }, []);

    const closeModal = useCallback(() => {
        setModalOpen(false);
        setEditingCategory(null);
    }, []);

    const handleSubmit = useCallback(
        async (values: { name: string }) => {
            try {
                if (editingCategory?._id) {
                    await updateCategory({
                        id: editingCategory._id,
                        body: values,
                    });
                    notification.success({ title: "Cập nhật danh mục thành công" });
                } else {
                    await createCategory(values);
                    notification.success({ title: "Tạo danh mục thành công" });
                }
                closeModal();
            } catch (error: unknown) {
                notification.error({ title: getErrorMessage(error, "Thao tác thất bại") });
            }
        },
        [editingCategory, updateCategory, createCategory, notification, closeModal],
    );

    const handleDelete = useCallback(
        (record: ICategoriesData) => {
            modal.confirm({
                title: "Xóa danh mục",
                content: `Bạn có chắc muốn xóa "${record.name}"?`,
                okText: "Xóa",
                okType: "danger",
                cancelText: "Hủy",
                onOk: async () => {
                    try {
                        await deleteCategory(record._id);
                        notification.success({ title: "Xóa danh mục thành công" });
                    } catch (error: unknown) {
                        notification.error({
                            title: getErrorMessage(error, "Xóa danh mục thất bại"),
                        });
                    }
                },
            });
        },
        [modal, deleteCategory, notification],
    );

    const handleReorder = useCallback(
        async (orderedItems: ICategoriesData[]) => {
            const previous = localItems;
            setLocalItems(orderedItems);

            try {
                await reorderCategories(orderedItems.map((item) => item._id));
            } catch (error: unknown) {
                setLocalItems(previous);
                notification.error({
                    title: getErrorMessage(error, "Cập nhật thứ tự thất bại"),
                });
            }
        },
        [localItems, reorderCategories, notification],
    );

    const value = useMemo<ICategoryContextProps>(
        () => ({
            search,
            items: localItems,
            // Only show loading for first load or a changed query (page/filter);
            // background refetches keep the current rows on screen.
            isLoading: isLoading || (isFetching && isPlaceholderData),
            isReordering,
            modalOpen,
            editingCategory,
            isSubmitting: isCreating || isUpdating,
            handleSearch,
            handleReorder,
            openCreateModal,
            openEditModal,
            closeModal,
            handleSubmit,
            handleDelete,
        }),
        [
            search,
            localItems,
            isLoading,
            isFetching,
            isPlaceholderData,
            isReordering,
            modalOpen,
            editingCategory,
            isCreating,
            isUpdating,
            handleSearch,
            handleReorder,
            openCreateModal,
            openEditModal,
            closeModal,
            handleSubmit,
            handleDelete,
        ],
    );

    return <CategoryContext.Provider value={value}>{children}</CategoryContext.Provider>;
}

export const useCategoryContext = () => {
    const context = useContext(CategoryContext);
    if (!context) {
        throw new Error("useCategoryContext must be used within a CategoryContextProvider");
    }
    return context;
};
