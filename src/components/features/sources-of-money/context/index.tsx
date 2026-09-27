"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAntdApp } from "@/libs/hooks/useAntdApp";
import {
    useCreateSourcesOfMoney,
    useDeleteSourcesOfMoney,
    useGetSourcesOfMoney,
    useReorderSourcesOfMoney,
    useUpdateSourcesOfMoney,
} from "@/libs/hooks/customHooks/useSourcesOfMoney";
import type {
    IFromSourcesOfMoneyData,
    ISourcesOfMoneyData,
    SourcesOfMoneyType,
} from "@/libs/interfaces/sourcesOfMoneyData";
import type { ISourcesOfMoneyContextProps } from "./type";

const LIST_LIMIT = 100;

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

    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState<SourcesOfMoneyType | "">("");
    const [localItems, setLocalItems] = useState<ISourcesOfMoneyData[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<ISourcesOfMoneyData | null>(null);

    const query = useMemo(
        () => ({
            page: 1,
            limit: LIST_LIMIT,
            search: search.trim() || undefined,
            type: typeFilter || undefined,
        }),
        [search, typeFilter],
    );

    const { data, isLoading, isFetching } = useGetSourcesOfMoney(query);
    const createMutation = useCreateSourcesOfMoney();
    const updateMutation = useUpdateSourcesOfMoney();
    const deleteMutation = useDeleteSourcesOfMoney();
    const reorderMutation = useReorderSourcesOfMoney();

    useEffect(() => {
        setLocalItems(data?.data?.items ?? []);
    }, [data?.data?.items]);

    const handleSearch = useCallback((value: string) => {
        setSearch(value);
    }, []);

    const handleTypeFilter = useCallback((value: SourcesOfMoneyType | "") => {
        setTypeFilter(value);
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

    const handleReorder = useCallback(
        async (orderedItems: ISourcesOfMoneyData[]) => {
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

    const value = useMemo<ISourcesOfMoneyContextProps>(
        () => ({
            search,
            typeFilter,
            items: localItems,
            isLoading: isLoading || isFetching,
            isReordering: reorderMutation.isPending,
            modalOpen,
            editingItem,
            isSubmitting: createMutation.isPending || updateMutation.isPending,
            handleSearch,
            handleTypeFilter,
            handleReorder,
            openCreateModal,
            openEditModal,
            closeModal,
            handleSubmit,
            handleDelete,
        }),
        [
            search,
            typeFilter,
            localItems,
            isLoading,
            isFetching,
            reorderMutation.isPending,
            modalOpen,
            editingItem,
            createMutation.isPending,
            updateMutation.isPending,
            handleSearch,
            handleTypeFilter,
            handleReorder,
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
