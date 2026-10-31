"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import useLocalStorage from "@/libs/hooks/useLocalStorage";
import { configLocalStorageKey } from "@/libs/constants/configKey";
import { useGetSourcesOfMoney } from "@/libs/hooks/customHooks/useSourcesOfMoney";
import {
    buildBestPicks,
    buildCardMetrics,
    buildVerdicts,
    DEFAULT_SCENARIO,
    getCreditCards,
    type ICompareScenario,
} from "@/components/features/credit-card-compare/utils";
import type { ICreditCardCompareContextProps } from "./type";

const CreditCardCompareContext = createContext<ICreditCardCompareContextProps | undefined>(
    undefined,
);

export default function CreditCardCompareContextProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    // Cùng query với các form khác để dùng chung cache; lọc thẻ ở client
    const { data, isLoading } = useGetSourcesOfMoney({ page: 1, limit: 100 });
    const [storedScenario, setStoredScenario] = useLocalStorage<ICompareScenario>(
        configLocalStorageKey.CREDIT_CARD_COMPARE_SCENARIO,
        DEFAULT_SCENARIO,
    );
    // Bản lưu cũ có thể thiếu trường mới
    const scenario = useMemo(
        () => ({ ...DEFAULT_SCENARIO, ...storedScenario }),
        [storedScenario],
    );

    const cards = useMemo(
        () =>
            getCreditCards(data?.data?.items ?? []).map((source) =>
                buildCardMetrics(source, scenario),
            ),
        [data, scenario],
    );
    const bestPicks = useMemo(() => buildBestPicks(cards, scenario), [cards, scenario]);
    const verdicts = useMemo(() => buildVerdicts(cards), [cards]);

    // setStoredScenario từ useLocalStorage không được memo; giữ handler ổn định theo scenario
    const handleScenarioChange = useCallback(
        (patch: Partial<ICompareScenario>) => setStoredScenario({ ...scenario, ...patch }),
        [scenario],
    );
    const handleResetScenario = useCallback(
        () => setStoredScenario(DEFAULT_SCENARIO),
        [],
    );

    const value = useMemo<ICreditCardCompareContextProps>(
        () => ({
            scenario,
            cards,
            bestPicks,
            verdicts,
            isLoading,
            handleScenarioChange,
            handleResetScenario,
        }),
        [scenario, cards, bestPicks, verdicts, isLoading, handleScenarioChange, handleResetScenario],
    );

    return (
        <CreditCardCompareContext.Provider value={value}>
            {children}
        </CreditCardCompareContext.Provider>
    );
}

export function useCreditCardCompareContext() {
    const context = useContext(CreditCardCompareContext);
    if (!context) {
        throw new Error(
            "useCreditCardCompareContext must be used within CreditCardCompareContextProvider",
        );
    }
    return context;
}
