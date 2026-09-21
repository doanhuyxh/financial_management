"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import dayjs, { type Dayjs } from "dayjs";
import { useGetDashboardExpensesSummary } from "@/libs/hooks/customHooks/useDashboard";
import type { IDashboardContextProps } from "./type";

interface IDashboardContextProviderProps {
    children: React.ReactNode;
}

const DashboardContext = createContext<IDashboardContextProps | undefined>(undefined);

export default function DashboardContextProvider({
    children,
}: IDashboardContextProviderProps) {
    const [monthValue, setMonthValue] = useState<Dayjs>(() => dayjs());

    const query = useMemo(
        () => ({
            year: monthValue.year(),
            month: monthValue.month() + 1,
        }),
        [monthValue],
    );

    const { data, isLoading, isFetching } = useGetDashboardExpensesSummary(query);

    const handleChangeMonth = useCallback((value: Dayjs | null) => {
        if (value) setMonthValue(value);
    }, []);

    const value = useMemo<IDashboardContextProps>(
        () => ({
            monthValue,
            summary: data?.data,
            isLoading: isLoading || isFetching,
            handleChangeMonth,
        }),
        [monthValue, data?.data, isLoading, isFetching, handleChangeMonth],
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
