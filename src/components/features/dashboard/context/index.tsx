"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dayjs, { type Dayjs } from "dayjs";
import {
    useGetDashboardCashflow,
    useGetDashboardExpensesSummary,
} from "@/libs/hooks/customHooks/useDashboard";
import {
    useGetCreditCardFeeProgress,
    useGetSourcesOfMoney,
} from "@/libs/hooks/customHooks/useSourcesOfMoney";
import { CardFeeType } from "@/libs/interfaces/expensesData";
import type { ICardRolloverData, IFromCardRolloverData } from "@/libs/interfaces/cardRolloversData";
import {
    useCreateCardRollover,
    useDeleteCardRollover,
    useGetCardRollovers,
} from "@/libs/hooks/customHooks/useCardRollovers";
import { useAppFeedback } from "@/libs/hooks/useAppFeedback";
import { buildTransactionsUrl } from "@/libs/utils/transactionsUrl";
import {
    buildAttentionItems,
    buildCreditCardFees,
    buildCreditCardsOverview,
    type ICreditCardFeeItem,
} from "@/components/features/dashboard/utils";
import { buildAssetsSummary } from "@/libs/utils/assetsSummary";
import type { IDashboardContextProps } from "./type";

interface IDashboardContextProviderProps {
    children: React.ReactNode;
}

const DashboardContext = createContext<IDashboardContextProps | undefined>(undefined);

export default function DashboardContextProvider({
    children,
}: IDashboardContextProviderProps) {
    const router = useRouter();
    const [monthValue, setMonthValue] = useState<Dayjs>(() => dayjs());

    const query = useMemo(
        () => ({
            year: monthValue.year(),
            month: monthValue.month() + 1,
        }),
        [monthValue],
    );

    const { data, isLoading, isFetching, isPlaceholderData } =
        useGetDashboardExpensesSummary(query);
    const {
        data: cashflowData,
        isLoading: isCashflowInitialLoading,
        isFetching: isCashflowFetching,
        isPlaceholderData: isCashflowPlaceholder,
    } = useGetDashboardCashflow(query);
    // Toàn bộ nguồn tiền: dùng cho phần Tài sản và khối Thẻ tín dụng
    const { data: sourcesData, isLoading: isSourcesLoading } = useGetSourcesOfMoney({
        page: 1,
        limit: 100,
    });
    const sources = sourcesData?.data?.items;

    const { data: feeProgressData } = useGetCreditCardFeeProgress();
    const feeProgress = feeProgressData?.data;
    const creditCardFees = useMemo(
        () => buildCreditCardFees(sources ?? [], feeProgress ?? []),
        [sources, feeProgress],
    );
    const creditCards = useMemo(
        () => buildCreditCardsOverview(sources ?? [], creditCardFees),
        [sources, creditCardFees],
    );
    const assets = useMemo(() => buildAssetsSummary(sources ?? []), [sources]);
    const totalCreditDebt = useMemo(
        () => creditCards.reduce((sum, item) => sum + Math.max(0, item.currentDebt), 0),
        [creditCards],
    );
    const attentionItems = useMemo(
        () =>
            isSourcesLoading
                ? []
                : buildAttentionItems(creditCards, assets.netWorth, totalCreditDebt, assets.cashTotal),
        [isSourcesLoading, creditCards, assets, totalCreditDebt],
    );

    const handleChangeMonth = useCallback((value: Dayjs | null) => {
        if (value) setMonthValue(value);
    }, []);

    // Đáo hạn thẻ: modal ghi lần dùng dịch vụ + xem/xóa các lần gần đây
    const { notification, modal } = useAppFeedback();
    const [rolloverCardId, setRolloverCardId] = useState<string | null>(null);
    const rolloverCard = useMemo(
        () => creditCards.find((card) => card._id === rolloverCardId) ?? null,
        [creditCards, rolloverCardId],
    );
    const { data: rolloversData, isLoading: isRolloverLoading } = useGetCardRollovers(
        { sourceOfMoneyId: rolloverCardId ?? undefined, page: 1, limit: 5 },
        Boolean(rolloverCardId),
    );
    const { mutateAsync: createRollover, isPending: isRolloverSubmitting } =
        useCreateCardRollover();
    const { mutateAsync: deleteRollover } = useDeleteCardRollover();

    const openRollover = useCallback((cardId: string) => setRolloverCardId(cardId), []);
    const closeRollover = useCallback(() => setRolloverCardId(null), []);

    const handleRolloverSubmit = useCallback(
        async (values: IFromCardRolloverData) => {
            try {
                const res = await createRollover(values);
                notification.success({ title: res?.message || "Đã ghi đáo hạn thẻ" });
                closeRollover();
                return true;
            } catch (error: unknown) {
                notification.error({
                    title: (error as { message?: string })?.message || "Ghi đáo hạn thất bại",
                });
                return false;
            }
        },
        [createRollover, notification, closeRollover],
    );

    const handleDeleteRollover = useCallback(
        (item: ICardRolloverData) => {
            modal.confirm({
                title: "Xóa lần đáo hạn này?",
                content: "Dư nợ thẻ sẽ giảm đúng phần phí đã ghi và khoản chi phí đáo hạn bị xóa.",
                okText: "Xóa",
                okType: "danger",
                onOk: async () => {
                    try {
                        await deleteRollover(item._id);
                        notification.success({ title: "Đã xóa lần đáo hạn" });
                    } catch (error: unknown) {
                        notification.error({
                            title: (error as { message?: string })?.message || "Xóa đáo hạn thất bại",
                        });
                    }
                },
            });
        },
        [deleteRollover, modal, notification],
    );

    // Trả nợ thẻ = chuyển tiền tới thẻ: mở form chuyển tiền điền sẵn thẻ đích và số dư nợ
    const handlePayCard = useCallback(
        (cardId: string, amount: number) => {
            router.push(
                buildTransactionsUrl("transfer", {
                    action: "create",
                    toSourceId: cardId,
                    amount: Math.round(amount),
                }),
            );
        },
        [router],
    );

    // Phí thực tế có thể khác ước tính: mở form chi tiêu điền sẵn để người dùng sửa số rồi lưu.
    // Khoản chi được đánh dấu phí thẻ nên không tính vào điều kiện miễn phí.
    const handleRecordCardFee = useCallback(
        (item: ICreditCardFeeItem, feeType: CardFeeType) => {
            const cycle = `kỳ ${item.cycleStart.format("DD/MM")} – ${item.cycleEnd
                .subtract(1, "day")
                .format("DD/MM/YYYY")}`;
            const byType: Record<CardFeeType, { label: string; period: string; amount?: number | null }> = {
                [CardFeeType.ANNUAL_FEE]: {
                    label: "Phí thường niên",
                    period: String((item.nextAnnualFeeDate ?? dayjs()).year()),
                    amount: item.annualFee,
                },
                [CardFeeType.MANAGEMENT_FEE]: {
                    label: "Phí quản lý",
                    period: cycle,
                    amount: item.managementFee,
                },
                [CardFeeType.PAYMENT_FEE]: {
                    label: "Phí thanh toán dư nợ",
                    period: cycle,
                    amount: item.paymentFee?.estimatedTotal,
                },
                [CardFeeType.USAGE_FEE]: {
                    label: "Phí sử dụng",
                    period: cycle,
                    amount: item.usageFee?.fee,
                },
                [CardFeeType.FOREIGN_FEE]: { label: "Phí giao dịch quốc tế", period: cycle },
                [CardFeeType.INTEREST]: {
                    label: "Lãi thẻ",
                    period: cycle,
                    amount: item.latePenalty?.estimatedMonthlyInterest,
                },
                [CardFeeType.LATE_FEE]: {
                    label: "Phí chậm thanh toán",
                    period: cycle,
                    amount: item.latePenalty?.lateFeeMin,
                },
                // Phí đáo hạn không ghi tay: đi qua modal đáo hạn để dư nợ và lịch sử khớp nhau
                [CardFeeType.ROLLOVER_FEE]: { label: "Phí đáo hạn", period: cycle },
            };
            const { label, period, amount } = byType[feeType];
            router.push(
                buildTransactionsUrl("expense", {
                    action: "create",
                    sourceOfMoneyId: item._id,
                    cardFeeType: feeType,
                    note: `${label} ${item.name} ${period}`,
                    amount: amount || undefined,
                }),
            );
        },
        [router],
    );

    // Bấm vào một cột trong biểu đồ theo ngày -> mở trang Chi tiêu đã lọc đúng ngày đó
    const handleViewDay = useCallback(
        (day: number) => {
            const date = monthValue.date(day).format("YYYY-MM-DD");
            router.push(buildTransactionsUrl("expense", { date }));
        },
        [monthValue, router],
    );

    const value = useMemo<IDashboardContextProps>(
        () => ({
            monthValue,
            summary: data?.data,
            // Spinner only on first load or month change, not on background refetch
            // (which would unmount and re-create the charts).
            isLoading: isLoading || (isFetching && isPlaceholderData),
            cashflow: cashflowData?.data,
            isCashflowLoading:
                isCashflowInitialLoading || (isCashflowFetching && isCashflowPlaceholder),
            creditCards,
            attentionItems,
            totalCreditDebt,
            assets,
            isSourcesLoading,
            handleChangeMonth,
            handlePayCard,
            handleRecordCardFee,
            handleViewDay,
            rolloverCard,
            openRollover,
            closeRollover,
            rolloverItems: rolloversData?.data?.items ?? [],
            isRolloverLoading,
            isRolloverSubmitting,
            handleRolloverSubmit,
            handleDeleteRollover,
        }),
        [
            monthValue,
            data?.data,
            isLoading,
            isFetching,
            isPlaceholderData,
            cashflowData?.data,
            isCashflowInitialLoading,
            isCashflowFetching,
            isCashflowPlaceholder,
            creditCards,
            attentionItems,
            totalCreditDebt,
            assets,
            isSourcesLoading,
            handleChangeMonth,
            handlePayCard,
            handleRecordCardFee,
            handleViewDay,
            rolloverCard,
            openRollover,
            closeRollover,
            rolloversData?.data?.items,
            isRolloverLoading,
            isRolloverSubmitting,
            handleRolloverSubmit,
            handleDeleteRollover,
        ],
    );

    return (
        <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>
    );
}

export const useDashboardContext = () => {
    const context = useContext(DashboardContext);
    if (!context) {
        throw new Error("useDashboardContext must be used within a DashboardContextProvider");
    }
    return context;
};
