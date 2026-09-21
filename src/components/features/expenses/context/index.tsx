"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { Dayjs } from "dayjs";
import type { TablePaginationConfig } from "antd/es/table";
import { useAntdApp } from "@/libs/hooks/useAntdApp";
import {
    useCreateExpense,
    useDeleteExpense,
    useGetExpenses,
    useUpdateExpense,
} from "@/libs/hooks/customHooks/useExpenses";
import type { IExpensesData, IFromExpensesData } from "@/libs/interfaces/expensesData";
import type { IExpensesContextProps } from "./type";

const DEFAULT_PAGE_SIZE = 10;

interface IExpensesContextProviderProps {
    children: React.ReactNode;
}

const ExpensesContext = createContext<IExpensesContextProps | undefined>(undefined);

function getErrorMessage(error: unknown, fallback: string) {
    if (error && typeof error === "object" && "message" in error) {
        return String((error as { message?: string }).message);
    }
    return fallback;
}

export default function ExpensesContextProvider({
    children,
}: IExpensesContextProviderProps) {
    const { notification, modal } = useAntdApp();

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [sourceFilter, setSourceFilter] = useState("");
    const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(
        null,
    );
    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<IExpensesData | null>(null);

    const query = useMemo(
        () => ({
            page,
            limit: pageSize,
            search: search.trim() || undefined,
            categoryId: categoryFilter || undefined,
            sourceOfMoneyId: sourceFilter || undefined,
            from: dateRange?.[0]?.startOf("day").toISOString(),
            to: dateRange?.[1]?.endOf("day").toISOString(),
        }),
        [page, pageSize, search, categoryFilter, sourceFilter, dateRange],
    );

    const { data, isLoading, isFetching } = useGetExpenses(query);
    const createMutation = useCreateExpense();
    const updateMutation = useUpdateExpense();
    const deleteMutation = useDeleteExpense();

    const items = data?.data?.items ?? [];
    const pagination = data?.data?.pagination;

    const handleSearch = useCallback((value: string) => {
        setSearch(value);
    }, []);

    const handleCategoryFilter = useCallback((value: string) => {
        setCategoryFilter(value);
        setPage(1);
    }, []);

    const handleSourceFilter = useCallback((value: string) => {
        setSourceFilter(value);
        setPage(1);
    }, []);

    const handleDateRange = useCallback(
        (range: [Dayjs | null, Dayjs | null] | null) => {
            setDateRange(range);
            setPage(1);
        },
        [],
    );

    const handleChangePage = useCallback((nextPage: number) => {
        setPage(nextPage);
    }, []);

    const handleTableChange = useCallback((pager: TablePaginationConfig) => {
        setPage(pager.current ?? 1);
        setPageSize(pager.pageSize ?? DEFAULT_PAGE_SIZE);
    }, []);

    const openCreateModal = useCallback(() => {
        setEditingItem(null);
        setModalOpen(true);
    }, []);

    const openEditModal = useCallback((record: IExpensesData) => {
        setEditingItem(record);
        setModalOpen(true);
    }, []);

    const closeModal = useCallback(() => {
        setModalOpen(false);
        setEditingItem(null);
    }, []);

    const handleSubmit = useCallback(
        async (values: IFromExpensesData) => {
            try {
                if (editingItem?._id) {
                    await updateMutation.mutateAsync({
                        id: editingItem._id,
                        body: values,
                    });
                    notification.success({ title: "Cập nhật chi tiêu thành công" });
                } else {
                    await createMutation.mutateAsync(values);
                    notification.success({ title: "Tạo chi tiêu thành công" });
                }
                closeModal();
            } catch (error: unknown) {
                notification.error({
                    title: getErrorMessage(error, "Thao tác thất bại"),
                });
            }
        },
        [editingItem, updateMutation, createMutation, notification, closeModal],
    );

    const handleDelete = useCallback(
        (record: IExpensesData) => {
            modal.confirm({
                title: "Xóa chi tiêu",
                content: "Bạn có chắc muốn xóa khoản chi tiêu này? Số tiền sẽ được hoàn vào nguồn.",
                okText: "Xóa",
                okType: "danger",
                cancelText: "Hủy",
                onOk: async () => {
                    try {
                        await deleteMutation.mutateAsync(record._id);
                        notification.success({ title: "Xóa chi tiêu thành công" });
                    } catch (error: unknown) {
                        notification.error({
                            title: getErrorMessage(error, "Xóa chi tiêu thất bại"),
                        });
                    }
                },
            });
        },
        [modal, deleteMutation, notification],
    );

    const value = useMemo<IExpensesContextProps>(
        () => ({
            search,
            categoryFilter,
            sourceFilter,
            dateRange,
            page,
            pageSize,
            items,
            pagination,
            isLoading: isLoading || isFetching,
            modalOpen,
            editingItem,
            isSubmitting: createMutation.isPending || updateMutation.isPending,
            handleSearch,
            handleCategoryFilter,
            handleSourceFilter,
            handleDateRange,
            handleChangePage,
            handleTableChange,
            openCreateModal,
            openEditModal,
            closeModal,
            handleSubmit,
            handleDelete,
        }),
        [
            search,
            categoryFilter,
            sourceFilter,
            dateRange,
            page,
            pageSize,
            items,
            pagination,
            isLoading,
            isFetching,
            modalOpen,
            editingItem,
            createMutation.isPending,
            updateMutation.isPending,
            handleSearch,
            handleCategoryFilter,
            handleSourceFilter,
            handleDateRange,
            handleChangePage,
            handleTableChange,
            openCreateModal,
            openEditModal,
            closeModal,
            handleSubmit,
            handleDelete,
        ],
    );

    return (
        <ExpensesContext.Provider value={value}>{children}</ExpensesContext.Provider>
    );
}

export const useExpensesContext = () => {
    const context = useContext(ExpensesContext);
    if (!context) {
        throw new Error("useExpensesContext must be used within a ExpensesContextProvider");
    }
    return context;
};
