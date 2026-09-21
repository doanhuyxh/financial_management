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

    const { data, isLoading, isFetching } = useGetCategories(query);
    const createMutation = useCreateCategory();
    const updateMutation = useUpdateCategory();
    const deleteMutation = useDeleteCategory();
    const reorderMutation = useReorderCategories();

    useEffect(() => {
        setLocalItems(data?.data?.items ?? []);
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
                    await updateMutation.mutateAsync({
                        id: editingCategory._id,
                        body: values,
                    });
                    notification.success({ title: "Cập nhật danh mục thành công" });
                } else {
                    await createMutation.mutateAsync(values);
                    notification.success({ title: "Tạo danh mục thành công" });
                }
                closeModal();
            } catch (error: unknown) {
                notification.error({ title: getErrorMessage(error, "Thao tác thất bại") });
            }
        },
        [editingCategory, updateMutation, createMutation, notification, closeModal],
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
                        await deleteMutation.mutateAsync(record._id);
                        notification.success({ title: "Xóa danh mục thành công" });
                    } catch (error: unknown) {
                        notification.error({
                            title: getErrorMessage(error, "Xóa danh mục thất bại"),
                        });
                    }
                },
            });
        },
        [modal, deleteMutation, notification],
    );

    const handleReorder = useCallback(
        async (orderedItems: ICategoriesData[]) => {
            const previous = localItems;
            setLocalItems(orderedItems);

            try {
                await reorderMutation.mutateAsync(orderedItems.map((item) => item._id));
            } catch (error: unknown) {
                setLocalItems(previous);
                notification.error({
                    title: getErrorMessage(error, "Cập nhật thứ tự thất bại"),
                });
            }
        },
        [localItems, reorderMutation, notification],
    );

    const value = useMemo<ICategoryContextProps>(
        () => ({
            search,
            items: localItems,
            isLoading: isLoading || isFetching,
            isReordering: reorderMutation.isPending,
            modalOpen,
            editingCategory,
            isSubmitting: createMutation.isPending || updateMutation.isPending,
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
            reorderMutation.isPending,
            modalOpen,
            editingCategory,
            createMutation.isPending,
            updateMutation.isPending,
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
