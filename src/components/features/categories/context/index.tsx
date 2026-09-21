"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { TablePaginationConfig } from "antd/es/table";
import { useAntdApp } from "@/libs/hooks/useAntdApp";
import {
    useCreateCategory,
    useDeleteCategory,
    useGetCategories,
    useUpdateCategory,
} from "@/libs/hooks/customHooks/useCategories";
import type { ICategoriesData } from "@/libs/interfaces/categoriesData";
import type { ICategoryContextProps } from "./type";

const DEFAULT_PAGE_SIZE = 10;

interface ICategoryContextProviderProps {
    children: React.ReactNode;
}

const CategoryContext = createContext<ICategoryContextProps | undefined>(undefined);

export default function CategoryContextProvider({ children }: ICategoryContextProviderProps) {
    const { notification, modal } = useAntdApp();

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
    const [search, setSearch] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<ICategoriesData | null>(null);

    const query = useMemo(
        () => ({
            page,
            limit: pageSize,
            search: search.trim() || undefined,
        }),
        [page, pageSize, search],
    );

    const { data, isLoading, isFetching } = useGetCategories(query);
    const createMutation = useCreateCategory();
    const updateMutation = useUpdateCategory();
    const deleteMutation = useDeleteCategory();

    const items = data?.data?.items ?? [];
    const pagination = data?.data?.pagination;

    const handleSearch = useCallback((value: string) => {
        setSearch(value);
    }, []);

    const handleChangePage = useCallback((nextPage: number) => {
        setPage(nextPage);
    }, []);

    const handleChangePageSize = useCallback((nextPageSize: number) => {
        setPageSize(nextPageSize);
    }, []);

    const handleTableChange = useCallback((pager: TablePaginationConfig) => {
        setPage(pager.current ?? 1);
        setPageSize(pager.pageSize ?? DEFAULT_PAGE_SIZE);
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
                const message =
                    error && typeof error === "object" && "message" in error
                        ? String((error as { message?: string }).message)
                        : "Thao tác thất bại";
                notification.error({ title: message });
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
                        const message =
                            error && typeof error === "object" && "message" in error
                                ? String((error as { message?: string }).message)
                                : "Xóa danh mục thất bại";
                        notification.error({ title: message });
                    }
                },
            });
        },
        [modal, deleteMutation, notification],
    );

    const value = useMemo<ICategoryContextProps>(
        () => ({
            search,
            page,
            pageSize,
            items,
            pagination,
            isLoading: isLoading || isFetching,
            modalOpen,
            editingCategory,
            isSubmitting: createMutation.isPending || updateMutation.isPending,
            handleSearch,
            handleChangePage,
            handleChangePageSize,
            handleTableChange,
            openCreateModal,
            openEditModal,
            closeModal,
            handleSubmit,
            handleDelete,
        }),
        [
            search,
            page,
            pageSize,
            items,
            pagination,
            isLoading,
            isFetching,
            modalOpen,
            editingCategory,
            createMutation.isPending,
            updateMutation.isPending,
            handleSearch,
            handleChangePage,
            handleChangePageSize,
            handleTableChange,
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
