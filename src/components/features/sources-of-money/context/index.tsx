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
import { useCreateTransfer } from "@/libs/hooks/customHooks/useTransfers";
import type {
    IFromSourcesOfMoneyData,
    ISourcesOfMoneyData,
    SourcesOfMoneyType,
} from "@/libs/interfaces/sourcesOfMoneyData";
import type { IFromTransfersData } from "@/libs/interfaces/transfersData";
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
    const [transferModalOpen, setTransferModalOpen] = useState(false);

    const query = useMemo(
        () => ({
            page: 1,
            limit: LIST_LIMIT,
            search: search.trim() || undefined,
            type: typeFilter || undefined,
        }),
        [search, typeFilter],
    );

    const { data, isLoading, isFetching, isPlaceholderData } = useGetSourcesOfMoney(query);
    const { mutateAsync: createSource, isPending: isCreating } = useCreateSourcesOfMoney();
    const { mutateAsync: updateSource, isPending: isUpdating } = useUpdateSourcesOfMoney();
    const { mutateAsync: deleteSource } = useDeleteSourcesOfMoney();
    const { mutateAsync: reorderSources, isPending: isReordering } =
        useReorderSourcesOfMoney();
    const { mutateAsync: createTransfer, isPending: isTransferSubmitting } =
        useCreateTransfer();

    useEffect(() => {
        setTimeout(() => {
            setLocalItems(data?.data?.items ?? []);
        }, 0);
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

    const openTransferModal = useCallback(() => {
        setTransferModalOpen(true);
    }, []);

    const closeTransferModal = useCallback(() => {
        setTransferModalOpen(false);
    }, []);

    const handleSubmit = useCallback(
        async (values: IFromSourcesOfMoneyData) => {
            try {
                if (editingItem?._id) {
                    await updateSource({
                        id: editingItem._id,
                        body: values,
                    });
                    notification.success({ title: "Cập nhật nguồn tiền thành công" });
                } else {
                    await createSource(values);
                    notification.success({ title: "Tạo nguồn tiền thành công" });
                }
                closeModal();
            } catch (error: unknown) {
                notification.error({
                    title: getErrorMessage(error, "Thao tác thất bại"),
                });
            }
        },
        [editingItem, updateSource, createSource, notification, closeModal],
    );

    const handleTransferSubmit = useCallback(
        async (values: IFromTransfersData, options?: { keepOpen?: boolean }) => {
            try {
                await createTransfer(values);
                notification.success({ title: "Chuyển tiền thành công" });
                if (!options?.keepOpen) {
                    closeTransferModal();
                }
                return true;
            } catch (error: unknown) {
                notification.error({
                    title: getErrorMessage(error, "Chuyển tiền thất bại"),
                });
                return false;
            }
        },
        [createTransfer, notification, closeTransferModal],
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
                        await deleteSource(record._id);
                        notification.success({ title: "Xóa nguồn tiền thành công" });
                    } catch (error: unknown) {
                        notification.error({
                            title: getErrorMessage(error, "Xóa nguồn tiền thất bại"),
                        });
                    }
                },
            });
        },
        [modal, deleteSource, notification],
    );

    const handleReorder = useCallback(
        async (orderedItems: ISourcesOfMoneyData[]) => {
            const previous = localItems;
            setLocalItems(orderedItems);

            try {
                await reorderSources(orderedItems.map((item) => item._id));
            } catch (error: unknown) {
                setLocalItems(previous);
                notification.error({
                    title: getErrorMessage(error, "Cập nhật thứ tự thất bại"),
                });
            }
        },
        [localItems, reorderSources, notification],
    );

    const value = useMemo<ISourcesOfMoneyContextProps>(
        () => ({
            search,
            typeFilter,
            items: localItems,
            // Only show loading for first load or a changed query (page/filter);
            // background refetches keep the current rows on screen.
            isLoading: isLoading || (isFetching && isPlaceholderData),
            isReordering,
            modalOpen,
            editingItem,
            isSubmitting: isCreating || isUpdating,
            transferModalOpen,
            isTransferSubmitting,
            handleSearch,
            handleTypeFilter,
            handleReorder,
            openCreateModal,
            openEditModal,
            closeModal,
            handleSubmit,
            handleDelete,
            openTransferModal,
            closeTransferModal,
            handleTransferSubmit,
        }),
        [
            search,
            typeFilter,
            localItems,
            isLoading,
            isFetching,
            isPlaceholderData,
            isReordering,
            modalOpen,
            editingItem,
            isCreating,
            isUpdating,
            transferModalOpen,
            isTransferSubmitting,
            handleSearch,
            handleTypeFilter,
            handleReorder,
            openCreateModal,
            openEditModal,
            closeModal,
            handleSubmit,
            handleDelete,
            openTransferModal,
            closeTransferModal,
            handleTransferSubmit,
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
