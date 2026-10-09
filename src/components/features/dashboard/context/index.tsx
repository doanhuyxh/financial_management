"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dayjs, { type Dayjs } from "dayjs";
import { useGetDashboardExpensesSummary } from "@/libs/hooks/customHooks/useDashboard";
import { useGetSourcesOfMoney } from "@/libs/hooks/customHooks/useSourcesOfMoney";
import { SourcesOfMoneyType } from "@/libs/interfaces/sourcesOfMoneyData";
import { MENU_KEY } from "@/libs/constants/menuKey";
import { buildCreditCardDebts } from "@/components/features/dashboard/utils";
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
    const { data: creditCardsData, isLoading: isCreditCardsLoading } =
        useGetSourcesOfMoney({
            page: 1,
            limit: 100,
            type: SourcesOfMoneyType.CREDIT_CARD,
        });

    const creditCardDebts = useMemo(
        () => buildCreditCardDebts(creditCardsData?.data?.items ?? []),
        [creditCardsData?.data?.items],
    );
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

    const value = useMemo<IDashboardContextProps>(
        () => ({
            monthValue,
            summary: data?.data,
            // Spinner only on first load or month change, not on background refetch
            // (which would unmount and re-create the charts).
            isLoading: isLoading || (isFetching && isPlaceholderData),
            creditCardDebts,
            totalCreditDebt,
            isCreditCardsLoading,
            handleChangeMonth,
            handleCreateExpense,
        }),
        [
            monthValue,
            data?.data,
            isLoading,
            isFetching,
            isPlaceholderData,
            creditCardDebts,
            totalCreditDebt,
            isCreditCardsLoading,
            handleChangeMonth,
            handleCreateExpense,
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
