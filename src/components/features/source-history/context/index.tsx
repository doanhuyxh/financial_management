"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { MENU_KEY } from "@/libs/constants/menuKey";
import {
    useCreateShareLink,
    useGetShareLinks,
    useGetSourceTransactions,
    useGetSourcesOfMoney,
    useRevokeShareLink,
} from "@/libs/hooks/customHooks/useSourcesOfMoney";
import { useAppFeedback } from "@/libs/hooks/useAppFeedback";
import { SourcesOfMoneyType } from "@/libs/interfaces/sourcesOfMoneyData";
import { SourceTransactionFilter } from "@/libs/interfaces/sourceTransactionsData";
import type {
    ICreatedShareLinkData,
    IFromShareLinkData,
    IShareLinkData,
} from "@/libs/interfaces/shareLinksData";
import { buildSourceHistoryUrl } from "@/libs/utils/sourceHistoryUrl";
import type { HistoryDateRange, ISourceHistoryContextProps } from "./type";

const LIST_LIMIT = 100;
const HISTORY_LIMIT = 20;
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const KIND_VALUES = Object.values(SourceTransactionFilter) as string[];

const SourceHistoryContext = createContext<ISourceHistoryContextProps | undefined>(undefined);

function getErrorMessage(error: unknown, fallback: string) {
    if (error && typeof error === "object" && "message" in error) {
        return String((error as { message?: string }).message);
    }
    return fallback;
}

function readDay(value: string | null) {
    return value && DAY_PATTERN.test(value) ? value : undefined;
}

export default function SourceHistoryContextProvider({ children }: { children: React.ReactNode }) {
    const { notification, modal } = useAppFeedback();
    const router = useRouter();
    const params = useParams<{ id: string }>();
    const searchParams = useSearchParams();
    const sourceId = params?.id ?? "";

    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [createdShareLink, setCreatedShareLink] = useState<ICreatedShareLinkData | null>(null);

    // Bộ lọc nằm trên URL: tải lại trang hoặc gửi link vẫn giữ; giá trị lạ thì bỏ qua
    const rawKind = searchParams.get("kind") ?? "";
    const kind = (KIND_VALUES.includes(rawKind) ? rawKind : "") as SourceTransactionFilter | "";
    const from = readDay(searchParams.get("from"));
    const to = readDay(searchParams.get("to"));
    const range = useMemo<HistoryDateRange>(() => ({ from, to }), [from, to]);
    const rawPage = Number(searchParams.get("page"));
    const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;

    const { data: sourcesData, isLoading: isSourceLoading } = useGetSourcesOfMoney({
        page: 1,
        limit: LIST_LIMIT,
    });
    const sources = useMemo(() => sourcesData?.data?.items ?? [], [sourcesData?.data?.items]);
    const source = useMemo(
        () => sources.find((item) => item._id === sourceId) ?? null,
        [sources, sourceId],
    );

    const query = useMemo(
        () => ({ page, limit: HISTORY_LIMIT, kind: kind || undefined, from, to }),
        [page, kind, from, to],
    );
    const { data, isLoading, isFetching, isPlaceholderData } = useGetSourceTransactions(
        source ? sourceId : null,
        query,
    );
    const { data: shareLinksData, isLoading: isShareLinksLoading } = useGetShareLinks(
        shareModalOpen && source ? sourceId : null,
    );
    const { mutateAsync: createShareLink, isPending: isCreatingShareLink } = useCreateShareLink();
    const { mutateAsync: revokeShareLink } = useRevokeShareLink();

    /** Ghi bộ lọc lên URL (replace để nút Back của trình duyệt quay về trang trước, không lùi từng bộ lọc). */
    const updateQuery = useCallback(
        (patch: Record<string, string | undefined>) => {
            const next = new URLSearchParams(searchParams.toString());
            for (const [key, value] of Object.entries(patch)) {
                if (value) next.set(key, value);
                else next.delete(key);
            }
            const qs = next.toString();
            router.replace(`${buildSourceHistoryUrl(sourceId)}${qs ? `?${qs}` : ""}`, {
                scroll: false,
            });
        },
        [router, searchParams, sourceId],
    );

    const handlePageChange = useCallback(
        (nextPage: number) => updateQuery({ page: nextPage > 1 ? String(nextPage) : undefined }),
        [updateQuery],
    );

    const handleKindChange = useCallback(
        (nextKind: SourceTransactionFilter | "") =>
            updateQuery({ kind: nextKind || undefined, page: undefined }),
        [updateQuery],
    );

    const handleRangeChange = useCallback(
        (nextRange: HistoryDateRange) =>
            updateQuery({ from: nextRange.from, to: nextRange.to, page: undefined }),
        [updateQuery],
    );

    // Đổi nguồn: bỏ bộ lọc cũ vì khoảng ngày/loại của nguồn này chưa chắc hợp với nguồn kia
    const handleSelectSource = useCallback(
        (nextId: string) => {
            if (nextId !== sourceId) router.push(buildSourceHistoryUrl(nextId));
        },
        [router, sourceId],
    );

    const handleBack = useCallback(() => router.push(MENU_KEY.SOURCES_OF_MONEY), [router]);

    const openShareModal = useCallback(() => {
        setCreatedShareLink(null);
        setShareModalOpen(true);
    }, []);

    const closeShareModal = useCallback(() => {
        setShareModalOpen(false);
        setCreatedShareLink(null);
    }, []);

    const handleCreateShareLink = useCallback(
        async (values: IFromShareLinkData) => {
            if (!source?._id) return;
            try {
                const res = await createShareLink({ sourceId: source._id, body: values });
                setCreatedShareLink(res.data);
                notification.success({ title: "Tạo link chia sẻ thành công" });
            } catch (error: unknown) {
                notification.error({ title: getErrorMessage(error, "Tạo link chia sẻ thất bại") });
            }
        },
        [source, createShareLink, notification],
    );

    const handleRevokeShareLink = useCallback(
        (link: IShareLinkData) => {
            modal.confirm({
                title: "Thu hồi link chia sẻ",
                content: "Người đang giữ link này sẽ không xem được nữa. Không hoàn tác được.",
                okText: "Thu hồi",
                okType: "danger",
                cancelText: "Hủy",
                onOk: async () => {
                    try {
                        await revokeShareLink(link._id);
                        setCreatedShareLink((current) => (current?._id === link._id ? null : current));
                        notification.success({ title: "Đã thu hồi link chia sẻ" });
                    } catch (error: unknown) {
                        notification.error({ title: getErrorMessage(error, "Thu hồi link thất bại") });
                    }
                },
            });
        },
        [modal, revokeShareLink, notification],
    );

    const value = useMemo<ISourceHistoryContextProps>(
        () => ({
            sourceId,
            source,
            sources,
            isSourceLoading,
            isCreditCard: source?.type === SourcesOfMoneyType.CREDIT_CARD,
            kind,
            range,
            items: data?.data?.items ?? [],
            pagination: data?.data?.pagination,
            summary: data?.data?.summary,
            breakdown: data?.data?.breakdown ?? [],
            // Chỉ báo tải khi tải lần đầu hoặc đổi bộ lọc/trang; refetch nền giữ nguyên dòng đang hiện
            isLoading: isLoading || (isFetching && isPlaceholderData),
            shareModalOpen,
            shareLinks: shareLinksData?.data ?? [],
            isShareLinksLoading,
            isCreatingShareLink,
            createdShareLink,
            handleSelectSource,
            handleBack,
            handlePageChange,
            handleKindChange,
            handleRangeChange,
            openShareModal,
            closeShareModal,
            handleCreateShareLink,
            handleRevokeShareLink,
        }),
        [
            sourceId,
            source,
            sources,
            isSourceLoading,
            kind,
            range,
            data,
            isLoading,
            isFetching,
            isPlaceholderData,
            shareModalOpen,
            shareLinksData,
            isShareLinksLoading,
            isCreatingShareLink,
            createdShareLink,
            handleSelectSource,
            handleBack,
            handlePageChange,
            handleKindChange,
            handleRangeChange,
            openShareModal,
            closeShareModal,
            handleCreateShareLink,
            handleRevokeShareLink,
        ],
    );

    return <SourceHistoryContext.Provider value={value}>{children}</SourceHistoryContext.Provider>;
}

export const useSourceHistoryContext = () => {
    const context = useContext(SourceHistoryContext);
    if (!context) {
        throw new Error("useSourceHistoryContext must be used within a SourceHistoryContextProvider");
    }
    return context;
};
