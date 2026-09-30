"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { Dayjs } from "dayjs";
import type { TablePaginationConfig } from "antd/es/table";
import { useAntdApp } from "@/libs/hooks/useAntdApp";
import {
    useCreateIncome,
    useDeleteIncome,
    useGetIncomes,
    useUpdateIncome,
} from "@/libs/hooks/customHooks/useIncomes";
import type { IFromIncomesData, IIncomesData } from "@/libs/interfaces/incomesData";
import type { IIncomesContextProps } from "./type";

const DEFAULT_PAGE_SIZE = 10;

interface IIncomesContextProviderProps {
    children: React.ReactNode;
}

const IncomesContext = createContext<IIncomesContextProps | undefined>(undefined);

function getErrorMessage(error: unknown, fallback: string) {
    if (error && typeof error === "object" && "message" in error) {
        return String((error as { message?: string }).message);
    }
    return fallback;
}

export default function IncomesContextProvider({
    children,
}: IIncomesContextProviderProps) {
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
    const [editingItem, setEditingItem] = useState<IIncomesData | null>(null);

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

    const { data, isLoading, isFetching } = useGetIncomes(query);
    const createMutation = useCreateIncome();
    const updateMutation = useUpdateIncome();
    const deleteMutation = useDeleteIncome();

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

    const openEditModal = useCallback((record: IIncomesData) => {
        setEditingItem(record);
        setModalOpen(true);
    }, []);

    const closeModal = useCallback(() => {
        setModalOpen(false);
        setEditingItem(null);
    }, []);

    const handleSubmit = useCallback(
        async (values: IFromIncomesData, options?: { keepOpen?: boolean }) => {
            try {
                if (editingItem?._id) {
                    await updateMutation.mutateAsync({
                        id: editingItem._id,
                        body: values,
                    });
                    notification.success({ title: "Cập nhật thu nhập thành công" });
                    closeModal();
                } else {
                    await createMutation.mutateAsync(values);
                    notification.success({ title: "Tạo thu nhập thành công" });
                    if (!options?.keepOpen) {
                        closeModal();
                    }
                }
                return true;
            } catch (error: unknown) {
                notification.error({
                    title: getErrorMessage(error, "Thao tác thất bại"),
                });
                return false;
            }
        },
        [editingItem, updateMutation, createMutation, notification, closeModal],
    );

    const handleDelete = useCallback(
        (record: IIncomesData) => {
            modal.confirm({
                title: "Xóa thu nhập",
                content:
                    "Bạn có chắc muốn xóa khoản thu nhập này? Số tiền sẽ được hoàn lại trên nguồn (giảm số dư / tăng dư nợ thẻ).",
                okText: "Xóa",
                okType: "danger",
                cancelText: "Hủy",
                onOk: async () => {
                    try {
                        await deleteMutation.mutateAsync(record._id);
                        notification.success({ title: "Xóa thu nhập thành công" });
                    } catch (error: unknown) {
                        notification.error({
                            title: getErrorMessage(error, "Xóa thu nhập thất bại"),
                        });
                    }
                },
            });
        },
        [modal, deleteMutation, notification],
    );

    const value = useMemo<IIncomesContextProps>(
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
        <IncomesContext.Provider value={value}>{children}</IncomesContext.Provider>
    );
}

export const useIncomesContext = () => {
    const context = useContext(IncomesContext);
    if (!context) {
        throw new Error("useIncomesContext must be used within a IncomesContextProvider");
    }
    return context;
};
