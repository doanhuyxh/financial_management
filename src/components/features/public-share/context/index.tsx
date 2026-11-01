"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import type { DayRange } from "@/components/common/day-range-filter";
import {
    useGetPublicShareInfo,
    useGetPublicShareTransactions,
} from "@/libs/hooks/customHooks/usePublicShare";
import { SourcesOfMoneyType } from "@/libs/interfaces/sourcesOfMoneyData";
import type { IPublicShareContextProps } from "./type";

const LIMIT = 20;

const PublicShareContext = createContext<IPublicShareContextProps | undefined>(undefined);

export default function PublicShareContextProvider({ children }: { children: React.ReactNode }) {
    const params = useParams<{ token: string }>();
    const token = params?.token ?? "";
    const [page, setPage] = useState(1);
    const [range, setRange] = useState<DayRange>({});

    const infoQuery = useGetPublicShareInfo(token);
    const info = infoQuery.data?.data;

    const query = useMemo(() => ({ page, limit: LIMIT, ...range }), [page, range]);
    const transactionsQuery = useGetPublicShareTransactions(token, query, Boolean(info));

    const handleRangeChange = useCallback((next: DayRange) => {
        setRange(next);
        setPage(1);
    }, []);

    const handlePageChange = useCallback((next: number) => {
        setPage(next);
    }, []);

    const value = useMemo<IPublicShareContextProps>(
        () => ({
            info,
            isInfoLoading: infoQuery.isLoading,
            isNotFound: !token || infoQuery.isError,
            isCreditCard: info?.sourceType === SourcesOfMoneyType.CREDIT_CARD,
            range,
            items: transactionsQuery.data?.data?.items ?? [],
            pagination: transactionsQuery.data?.data?.pagination,
            isTransactionsLoading:
                transactionsQuery.isLoading ||
                (transactionsQuery.isFetching && transactionsQuery.isPlaceholderData),
            handleRangeChange,
            handlePageChange,
        }),
        [
            info,
            token,
            infoQuery.isLoading,
            infoQuery.isError,
            range,
            transactionsQuery.data,
            transactionsQuery.isLoading,
            transactionsQuery.isFetching,
            transactionsQuery.isPlaceholderData,
            handleRangeChange,
            handlePageChange,
        ],
    );

    return <PublicShareContext.Provider value={value}>{children}</PublicShareContext.Provider>;
}

export const usePublicShareContext = () => {
    const context = useContext(PublicShareContext);
    if (!context) {
        throw new Error("usePublicShareContext must be used within a PublicShareContextProvider");
    }
    return context;
};
