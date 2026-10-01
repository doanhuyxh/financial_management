"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { Dayjs } from "dayjs";
import type { TablePaginationConfig } from "antd/es/table";
import { useAntdApp } from "@/libs/hooks/useAntdApp";
import {
    useCreateTransfer,
    useDeleteTransfer,
    useGetTransfers,
} from "@/libs/hooks/customHooks/useTransfers";
import type {
    IFromTransfersData,
    ITransfersData,
} from "@/libs/interfaces/transfersData";
import type { ITransfersContextProps } from "./type";

const DEFAULT_PAGE_SIZE = 10;

interface ITransfersContextProviderProps {
    children: React.ReactNode;
}

const TransfersContext = createContext<ITransfersContextProps | undefined>(
    undefined,
);

function getErrorMessage(error: unknown, fallback: string) {
    if (error && typeof error === "object" && "message" in error) {
        return String((error as { message?: string }).message);
    }
    return fallback;
}

export default function TransfersContextProvider({
    children,
}: ITransfersContextProviderProps) {
    const { notification, modal } = useAntdApp();

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
    const [search, setSearch] = useState("");
    const [fromSourceFilter, setFromSourceFilter] = useState("");
    const [toSourceFilter, setToSourceFilter] = useState("");
    const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(
        null,
    );
    const [modalOpen, setModalOpen] = useState(false);

    const query = useMemo(
        () => ({
            page,
            limit: pageSize,
            search: search.trim() || undefined,
            fromSourceId: fromSourceFilter || undefined,
            toSourceId: toSourceFilter || undefined,
            from: dateRange?.[0]?.startOf("day").toISOString(),
            to: dateRange?.[1]?.endOf("day").toISOString(),
        }),
        [page, pageSize, search, fromSourceFilter, toSourceFilter, dateRange],
    );

    const { data, isLoading, isFetching } = useGetTransfers(query);
    const createMutation = useCreateTransfer();
    const deleteMutation = useDeleteTransfer();

    const items = data?.data?.items ?? [];
    const pagination = data?.data?.pagination;

    const handleSearch = useCallback((value: string) => {
        setSearch(value);
    }, []);

    const handleFromSourceFilter = useCallback((value: string) => {
        setFromSourceFilter(value);
        setPage(1);
    }, []);

    const handleToSourceFilter = useCallback((value: string) => {
        setToSourceFilter(value);
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
        setModalOpen(true);
    }, []);

    const closeModal = useCallback(() => {
        setModalOpen(false);
    }, []);

    const handleSubmit = useCallback(
        async (values: IFromTransfersData, options?: { keepOpen?: boolean }) => {
            try {
                await createMutation.mutateAsync(values);
                notification.success({ title: "Chuyển tiền thành công" });
                if (!options?.keepOpen) {
                    closeModal();
                }
                return true;
            } catch (error: unknown) {
                notification.error({
                    title: getErrorMessage(error, "Chuyển tiền thất bại"),
                });
                return false;
            }
        },
        [createMutation, notification, closeModal],
    );

    const handleDelete = useCallback(
        (record: ITransfersData) => {
            modal.confirm({
                title: "Xóa giao dịch chuyển tiền",
                content:
                    "Bạn có chắc muốn xóa? Số dư nguồn tiền sẽ được hoàn tác và chi tiêu phí (nếu có) sẽ bị xóa.",
                okText: "Xóa",
                okType: "danger",
                cancelText: "Hủy",
                onOk: async () => {
                    try {
                        await deleteMutation.mutateAsync(record._id);
                        notification.success({
                            title: "Xóa giao dịch chuyển tiền thành công",
                        });
                    } catch (error: unknown) {
                        notification.error({
                            title: getErrorMessage(
                                error,
                                "Xóa giao dịch chuyển tiền thất bại",
                            ),
                        });
                    }
                },
            });
        },
        [modal, deleteMutation, notification],
    );

    const value = useMemo<ITransfersContextProps>(
        () => ({
            search,
            fromSourceFilter,
            toSourceFilter,
            dateRange,
            page,
            pageSize,
            items,
            pagination,
            isLoading: isLoading || isFetching,
            modalOpen,
            isSubmitting: createMutation.isPending,
            handleSearch,
            handleFromSourceFilter,
            handleToSourceFilter,
            handleDateRange,
            handleChangePage,
            handleTableChange,
            openCreateModal,
            closeModal,
            handleSubmit,
            handleDelete,
        }),
        [
            search,
            fromSourceFilter,
            toSourceFilter,
            dateRange,
            page,
            pageSize,
            items,
            pagination,
            isLoading,
            isFetching,
            modalOpen,
            createMutation.isPending,
            handleSearch,
            handleFromSourceFilter,
            handleToSourceFilter,
            handleDateRange,
            handleChangePage,
            handleTableChange,
            openCreateModal,
            closeModal,
            handleSubmit,
            handleDelete,
        ],
    );

    return (
        <TransfersContext.Provider value={value}>
            {children}
        </TransfersContext.Provider>
    );
}

export const useTransfersContext = () => {
    const context = useContext(TransfersContext);
    if (!context) {
        throw new Error(
            "useTransfersContext must be used within a TransfersContextProvider",
        );
    }
    return context;
};
