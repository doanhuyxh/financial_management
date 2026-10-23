"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAntdApp } from "@/libs/hooks/useAntdApp";
import useLocalStorage from "@/libs/hooks/useLocalStorage";
import { configLocalStorageKey } from "@/libs/constants/configKey";
import { getTrackedAmount } from "@/libs/utils/trackedAmount";
import {
    useCreateSourcesOfMoney,
    useDeleteSourcesOfMoney,
    useGetBalanceAdjustments,
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

function getErrorStatusCode(error: unknown) {
    if (error && typeof error === "object" && "statusCode" in error) {
        return Number((error as { statusCode?: number }).statusCode);
    }
    return undefined;
}

export default function SourcesOfMoneyContextProvider({
    children,
}: ISourcesOfMoneyContextProviderProps) {
    const { notification, modal } = useAntdApp();

    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState<SourcesOfMoneyType | "">("");
    const [hideEmpty, setHideEmpty] = useLocalStorage(
        configLocalStorageKey.SOURCES_HIDE_EMPTY,
        false,
    );
    const [localItems, setLocalItems] = useState<ISourcesOfMoneyData[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<ISourcesOfMoneyData | null>(null);
    const [transferModalOpen, setTransferModalOpen] = useState(false);
    const [historySource, setHistorySource] = useState<ISourcesOfMoneyData | null>(null);
    const [historyPage, setHistoryPage] = useState(1);
    const [qrSource, setQrSource] = useState<ISourcesOfMoneyData | null>(null);

    const query = useMemo(
        () => ({
            page: 1,
            limit: LIST_LIMIT,
            search: search.trim() || undefined,
            type: typeFilter || undefined,
        }),
        [search, typeFilter],
    );

    const { data, isLoading, isFetching, isPlaceholderData, refetch } =
        useGetSourcesOfMoney(query);
    const { mutateAsync: createSource, isPending: isCreating } = useCreateSourcesOfMoney();
    const { mutateAsync: updateSource, isPending: isUpdating } = useUpdateSourcesOfMoney();
    const { mutateAsync: deleteSource } = useDeleteSourcesOfMoney();
    const { mutateAsync: reorderSources, isPending: isReordering } =
        useReorderSourcesOfMoney();
    const { mutateAsync: createTransfer, isPending: isTransferSubmitting } =
        useCreateTransfer();
    const {
        data: historyData,
        isLoading: isHistoryInitialLoading,
        isFetching: isHistoryFetching,
        isPlaceholderData: isHistoryPlaceholder,
    } = useGetBalanceAdjustments(historySource?._id ?? null, historyPage);

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

    const handleHideEmpty = useCallback(
        (value: boolean) => setHideEmpty(value),
        // setHideEmpty from useLocalStorage is not memoized; keep the handler stable
        [],
    );

    // Lọc phía client: nguồn thường số dư = 0, thẻ tín dụng dư nợ = 0
    const visibleItems = useMemo(
        () => (hideEmpty ? localItems.filter((item) => getTrackedAmount(item) !== 0) : localItems),
        [hideEmpty, localItems],
    );

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

    const openHistory = useCallback((record: ISourcesOfMoneyData) => {
        setHistoryPage(1);
        setHistorySource(record);
    }, []);

    const closeHistory = useCallback(() => {
        setHistorySource(null);
    }, []);

    const handleHistoryPageChange = useCallback((page: number) => {
        setHistoryPage(page);
    }, []);

    const openQr = useCallback((record: ISourcesOfMoneyData) => {
        setQrSource(record);
    }, []);

    const closeQr = useCallback(() => {
        setQrSource(null);
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
                // 409: số dư/dư nợ vừa đổi do giao dịch khác. Nạp lại bản ghi để form có
                // expectedAmount mới, nếu không lần lưu sau vẫn gửi số cũ và lại bị 409.
                if (getErrorStatusCode(error) === 409 && editingItem?._id) {
                    const { data: fresh } = await refetch();
                    const latest = fresh?.data?.items.find((item) => item._id === editingItem._id);
                    if (latest) {
                        setEditingItem(latest);
                        notification.warning({
                            title: getErrorMessage(error, "Số dư vừa thay đổi"),
                            description: "Form đã được cập nhật số mới nhất. Hãy kiểm tra rồi lưu lại.",
                        });
                        return;
                    }
                }
                notification.error({
                    title: getErrorMessage(error, "Thao tác thất bại"),
                });
            }
        },
        [editingItem, updateSource, createSource, notification, closeModal, refetch],
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
                content: `Bạn có chắc muốn xóa "${record.name}"? Nếu nguồn tiền đã có giao dịch, số dư hoặc dư nợ phải bằng 0 và lịch sử vẫn giữ tên nguồn.`,
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
            hideEmpty,
            hiddenCount: localItems.length - visibleItems.length,
            items: visibleItems,
            // Only show loading for first load or a changed query (page/filter);
            // background refetches keep the current rows on screen.
            isLoading: isLoading || (isFetching && isPlaceholderData),
            isReordering,
            canReorder: !query.search && !query.type && !hideEmpty,
            modalOpen,
            editingItem,
            isSubmitting: isCreating || isUpdating,
            transferModalOpen,
            isTransferSubmitting,
            historySource,
            historyItems: historyData?.data?.items ?? [],
            historyPagination: historyData?.data?.pagination,
            isHistoryLoading:
                isHistoryInitialLoading || (isHistoryFetching && isHistoryPlaceholder),
            qrSource,
            handleSearch,
            handleTypeFilter,
            handleHideEmpty,
            handleReorder,
            openCreateModal,
            openEditModal,
            closeModal,
            handleSubmit,
            handleDelete,
            openHistory,
            closeHistory,
            handleHistoryPageChange,
            openQr,
            closeQr,
            openTransferModal,
            closeTransferModal,
            handleTransferSubmit,
        }),
        [
            search,
            typeFilter,
            hideEmpty,
            query,
            localItems,
            visibleItems,
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
            historySource,
            historyData,
            isHistoryInitialLoading,
            isHistoryFetching,
            isHistoryPlaceholder,
            qrSource,
            handleSearch,
            handleTypeFilter,
            handleHideEmpty,
            handleReorder,
            openCreateModal,
            openEditModal,
            closeModal,
            handleSubmit,
            handleDelete,
            openHistory,
            closeHistory,
            handleHistoryPageChange,
            openQr,
            closeQr,
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
