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
import { MENU_KEY } from "@/libs/constants/menuKey";
import {
    buildAssetsSummary,
    buildCreditCardDebts,
    buildCreditCardFees,
    type ICreditCardFeeItem,
} from "@/components/features/dashboard/utils";
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
    // Toàn bộ nguồn tiền: dùng cho cả bảng dư nợ thẻ và phần Tài sản
    const { data: sourcesData, isLoading: isSourcesLoading } = useGetSourcesOfMoney({
        page: 1,
        limit: 100,
    });
    const sources = sourcesData?.data?.items;

    const creditCardDebts = useMemo(() => buildCreditCardDebts(sources ?? []), [sources]);
    const { data: feeProgressData } = useGetCreditCardFeeProgress();
    const feeProgress = feeProgressData?.data;
    const creditCardFees = useMemo(
        () => buildCreditCardFees(sources ?? [], feeProgress ?? []),
        [sources, feeProgress],
    );
    const assets = useMemo(() => buildAssetsSummary(sources ?? []), [sources]);
    const totalCreditDebt = useMemo(
        () => creditCardDebts.reduce((sum, item) => sum + item.currentDebt, 0),
        [creditCardDebts],
    );

    const handleChangeMonth = useCallback((value: Dayjs | null) => {
        if (value) setMonthValue(value);
    }, []);

    const handleCreateExpense = useCallback(() => {
        router.push(`${MENU_KEY.EXPENSES}?action=create`);
    }, [router]);

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
            };
            const { label, period, amount } = byType[feeType];
            const params = new URLSearchParams({
                action: "create",
                sourceOfMoneyId: item._id,
                cardFeeType: feeType,
                note: `${label} ${item.name} ${period}`,
            });
            if (amount) params.set("amount", String(amount));
            router.push(`${MENU_KEY.EXPENSES}?${params.toString()}`);
        },
        [router],
    );

    // Bấm vào một cột trong biểu đồ theo ngày -> mở trang Chi tiêu đã lọc đúng ngày đó
    const handleViewDay = useCallback(
        (day: number) => {
            const date = monthValue.date(day).format("YYYY-MM-DD");
            router.push(`${MENU_KEY.EXPENSES}?date=${date}`);
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
            creditCardDebts,
            totalCreditDebt,
            creditCardFees,
            assets,
            isSourcesLoading,
            handleChangeMonth,
            handleCreateExpense,
            handleRecordCardFee,
            handleViewDay,
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
            creditCardDebts,
            totalCreditDebt,
            creditCardFees,
            assets,
            isSourcesLoading,
            handleChangeMonth,
            handleCreateExpense,
            handleRecordCardFee,
            handleViewDay,
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
