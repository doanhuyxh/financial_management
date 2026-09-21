"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { TablePaginationConfig } from "antd/es/table";
import { useAntdApp } from "@/libs/hooks/useAntdApp";
import {
    useCreateSourcesOfMoney,
    useDeleteSourcesOfMoney,
    useGetSourcesOfMoney,
    useUpdateSourcesOfMoney,
} from "@/libs/hooks/customHooks/useSourcesOfMoney";
import type {
    IFromSourcesOfMoneyData,
    ISourcesOfMoneyData,
    SourcesOfMoneyType,
} from "@/libs/interfaces/sourcesOfMoneyData";
import type { ISourcesOfMoneyContextProps } from "./type";

const DEFAULT_PAGE_SIZE = 10;

interface ISourcesOfMoneyContextProviderProps {
    children: React.ReactNode;
}

const SourcesOfMoneyContext = createContext<ISourcesOfMoneyContextProps | undefined>(
    undefined,
);

function getErrorMessage(error: unknown, fallback: string) {
    if (error && typeof error === "object" && "message" in error) {
        return String((error as { message?: string }).message);
    }
    return fallback;
}

export default function SourcesOfMoneyContextProvider({
    children,
}: ISourcesOfMoneyContextProviderProps) {
    const { notification, modal } = useAntdApp();

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState<SourcesOfMoneyType | "">("");
    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<ISourcesOfMoneyData | null>(null);

    const query = useMemo(
        () => ({
            page,
            limit: pageSize,
            search: search.trim() || undefined,
            type: typeFilter || undefined,
        }),
        [page, pageSize, search, typeFilter],
    );

    const { data, isLoading, isFetching } = useGetSourcesOfMoney(query);
    const createMutation = useCreateSourcesOfMoney();
    const updateMutation = useUpdateSourcesOfMoney();
    const deleteMutation = useDeleteSourcesOfMoney();

    const items = data?.data?.items ?? [];
    const pagination = data?.data?.pagination;

    const handleSearch = useCallback((value: string) => {
        setSearch(value);
    }, []);

    const handleTypeFilter = useCallback((value: SourcesOfMoneyType | "") => {
        setTypeFilter(value);
        setPage(1);
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
        setEditingItem(null);
        setModalOpen(true);
    }, []);

    const openEditModal = useCallback((record: ISourcesOfMoneyData) => {
        setEditingItem(record);
        setModalOpen(true);
    }, []);

    const closeModal = useCallback(() => {
        setModalOpen(false);
        setEditingItem(null);
    }, []);

    const handleSubmit = useCallback(
        async (values: IFromSourcesOfMoneyData) => {
            try {
                if (editingItem?._id) {
                    await updateMutation.mutateAsync({
                        id: editingItem._id,
                        body: values,
                    });
                    notification.success({ title: "Cập nhật nguồn tiền thành công" });
                } else {
                    await createMutation.mutateAsync(values);
                    notification.success({ title: "Tạo nguồn tiền thành công" });
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
        (record: ISourcesOfMoneyData) => {
            modal.confirm({
                title: "Xóa nguồn tiền",
                content: `Bạn có chắc muốn xóa "${record.name}"?`,
                okText: "Xóa",
                okType: "danger",
                cancelText: "Hủy",
                onOk: async () => {
                    try {
                        await deleteMutation.mutateAsync(record._id);
                        notification.success({ title: "Xóa nguồn tiền thành công" });
                    } catch (error: unknown) {
                        notification.error({
                            title: getErrorMessage(error, "Xóa nguồn tiền thất bại"),
                        });
                    }
                },
            });
        },
        [modal, deleteMutation, notification],
    );

    const value = useMemo<ISourcesOfMoneyContextProps>(
        () => ({
            search,
            typeFilter,
            page,
            pageSize,
            items,
            pagination,
            isLoading: isLoading || isFetching,
            modalOpen,
            editingItem,
            isSubmitting: createMutation.isPending || updateMutation.isPending,
            handleSearch,
            handleTypeFilter,
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
            typeFilter,
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
            handleTypeFilter,
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

    return (
        <SourcesOfMoneyContext.Provider value={value}>
            {children}
        </SourcesOfMoneyContext.Provider>
    );
}

export const useSourcesOfMoneyContext = () => {
    const context = useContext(SourcesOfMoneyContext);
    if (!context) {
        throw new Error(
            "useSourcesOfMoneyContext must be used within a SourcesOfMoneyContextProvider",
        );
    }
    return context;
};
