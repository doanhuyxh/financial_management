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
import { useSearchParams } from "next/navigation";
import type { ITransferCreateDefaults, ITransfersContextProps } from "./type";
import { formatMoney } from "@/libs/utils/formatMoney";
import type { IDayTotal } from "@/libs/interfaces/ApiResponseData";

const DEFAULT_PAGE_SIZE = 10;
const EMPTY_ITEMS: ITransfersData[] = [];
const EMPTY_DAY_TOTALS: IDayTotal[] = [];

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
    const searchParams = useSearchParams();

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
    const [search, setSearch] = useState("");
    const [fromSourceFilter, setFromSourceFilter] = useState("");
    const [toSourceFilter, setToSourceFilter] = useState("");
    const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(
        null,
    );
    // `?action=create&fromSourceId=&toSourceId=&amount=` mở sẵn form đã điền (VD: "Trả nợ" từ dashboard)
    const [modalOpen, setModalOpen] = useState(
        () => searchParams.get("action") === "create",
    );
    const [createDefaults, setCreateDefaults] = useState<ITransferCreateDefaults | null>(() => {
        if (searchParams.get("action") !== "create") return null;
        const amount = Number(searchParams.get("amount"));
        const defaults: ITransferCreateDefaults = {
            fromSourceId: searchParams.get("fromSourceId") || undefined,
            toSourceId: searchParams.get("toSourceId") || undefined,
            amount: Number.isFinite(amount) && amount > 0 ? amount : undefined,
        };
        return Object.values(defaults).some((value) => value !== undefined) ? defaults : null;
    });

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

    const { data, isLoading, isFetching, isPlaceholderData } = useGetTransfers(query);
    const { mutateAsync: createTransfer, isPending: isCreating } = useCreateTransfer();
    const { mutateAsync: deleteTransfer } = useDeleteTransfer();

    const items = data?.data?.items ?? EMPTY_ITEMS;
    const pagination = data?.data?.pagination;
    const summary = data?.data?.summary;
    const dayTotals = data?.data?.dayTotals ?? EMPTY_DAY_TOTALS;

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
        setCreateDefaults(null);
        setModalOpen(true);
    }, []);

    const closeModal = useCallback(() => {
        setModalOpen(false);
        setCreateDefaults(null);
    }, []);

    const handleSubmit = useCallback(
        async (values: IFromTransfersData, options?: { keepOpen?: boolean }) => {
            try {
                await createTransfer(values);
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
        [createTransfer, notification, closeModal],
    );

    const handleDelete = useCallback(
        (record: ITransfersData) => {
            modal.confirm({
                title: "Xóa giao dịch chuyển tiền",
                content: `Xóa chuyển tiền ${formatMoney(record.amount)}? Số dư nguồn tiền sẽ được hoàn tác và chi tiêu phí (nếu có) sẽ bị xóa.`,
                okText: "Xóa",
                okType: "danger",
                cancelText: "Hủy",
                onOk: async () => {
                    try {
                        await deleteTransfer(record._id);
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
        [modal, deleteTransfer, notification],
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
            summary,
            dayTotals,
            // Only show loading for first load or a changed query (page/filter);
            // background refetches keep the current rows on screen.
            isLoading: isLoading || (isFetching && isPlaceholderData),
            modalOpen,
            createDefaults,
            isSubmitting: isCreating,
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
            summary,
            dayTotals,
            isLoading,
            isFetching,
            isPlaceholderData,
            modalOpen,
            createDefaults,
            isCreating,
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
