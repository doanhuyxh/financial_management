"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import useLocalStorage from "@/libs/hooks/useLocalStorage";
import { useAppFeedback } from "@/libs/hooks/useAppFeedback";
import { useVietQrBanks } from "@/libs/hooks/customHooks/useVietQrBanks";
import {
    useCreateDepositRate,
    useDeleteDepositRate,
    useGetDepositRates,
    useRefreshDepositRates,
    useUpdateDepositRate,
} from "@/libs/hooks/customHooks/useDepositRates";
import { configLocalStorageKey } from "@/libs/constants/configKey";
import type { IDepositRateTableData, IFromDepositRateData } from "@/libs/interfaces/depositRatesData";
import {
    buildDepositRows,
    DEFAULT_DEPOSIT_SCENARIO,
    getAvailableTerms,
    hasRates,
    type IDepositScenario,
} from "@/components/features/deposit-rate-compare/utils";
import type { IDepositRateCompareContextProps } from "./type";

const DepositRateCompareContext = createContext<IDepositRateCompareContextProps | undefined>(undefined);

function getErrorMessage(error: unknown, fallback: string) {
    if (error && typeof error === "object" && "message" in error) {
        return String((error as { message?: string }).message);
    }
    return fallback;
}

export default function DepositRateCompareContextProvider({ children }: { children: React.ReactNode }) {
    const { notification, modal } = useAppFeedback();
    const { data, isLoading } = useGetDepositRates();
    const { data: banks = [] } = useVietQrBanks();
    const { mutateAsync: refresh, isPending: isRefreshing } = useRefreshDepositRates();
    const { mutateAsync: createRate, isPending: isCreating } = useCreateDepositRate();
    const { mutateAsync: updateRate, isPending: isUpdating } = useUpdateDepositRate();
    const { mutateAsync: deleteRate } = useDeleteDepositRate();

    const [storedScenario, setStoredScenario] = useLocalStorage<IDepositScenario>(
        configLocalStorageKey.DEPOSIT_RATE_COMPARE_SCENARIO,
        DEFAULT_DEPOSIT_SCENARIO,
    );
    const scenario = useMemo(
        () => ({ ...DEFAULT_DEPOSIT_SCENARIO, ...storedScenario }),
        [storedScenario],
    );
    const [editor, setEditor] = useState<{ table: IDepositRateTableData | null } | null>(null);

    const tables = useMemo(() => data?.data?.tables ?? [], [data]);
    const ratedTables = useMemo(() => tables.filter(hasRates), [tables]);
    const rows = useMemo(() => buildDepositRows(ratedTables, scenario), [ratedTables, scenario]);
    const availableTerms = useMemo(() => getAvailableTerms(ratedTables), [ratedTables]);

    const logoByCode = useMemo(() => new Map(banks.map((bank) => [bank.code, bank.logo])), [banks]);
    const getBankLogo = useCallback((bankCode: string) => logoByCode.get(bankCode), [logoByCode]);

    const handleScenarioChange = useCallback(
        (patch: Partial<IDepositScenario>) => setStoredScenario({ ...scenario, ...patch }),
        [scenario],
    );

    const handleRefresh = useCallback(async () => {
        try {
            const response = await refresh();
            notification.success({ title: response.message || "Đã lấy lại lãi suất" });
        } catch (error) {
            notification.error({ title: getErrorMessage(error, "Không lấy lại được lãi suất") });
        }
    }, [refresh, notification]);

    const handleSubmit = useCallback(
        async (body: IFromDepositRateData) => {
            try {
                if (editor?.table) await updateRate({ id: editor.table._id, body });
                else await createRate(body);
                notification.success({ title: editor?.table ? "Đã cập nhật lãi suất" : "Đã thêm lãi suất" });
                setEditor(null);
                return true;
            } catch (error) {
                notification.error({ title: getErrorMessage(error, "Lưu lãi suất thất bại") });
                return false;
            }
        },
        [editor, createRate, updateRate, notification],
    );

    const handleDelete = useCallback(
        (table: IDepositRateTableData) => {
            modal.confirm({
                title: `Xóa lãi suất ${table.bankName}${table.product ? ` – ${table.product}` : ""}?`,
                content: "Bảng lãi suất bạn tự nhập sẽ bị xóa khỏi trang so sánh.",
                okText: "Xóa",
                okType: "danger",
                onOk: async () => {
                    try {
                        await deleteRate(table._id);
                        notification.success({ title: "Đã xóa" });
                    } catch (error) {
                        notification.error({ title: getErrorMessage(error, "Xóa thất bại") });
                    }
                },
            });
        },
        [deleteRate, modal, notification],
    );

    const value: IDepositRateCompareContextProps = {
        scenario,
        tables,
        rows,
        availableTerms,
        banks,
        isLoading,
        isRefreshing,
        isSaving: isCreating || isUpdating,
        editor,
        getBankLogo,
        handleScenarioChange,
        handleRefresh,
        handleOpenCreate: () => setEditor({ table: null }),
        handleOpenEdit: (table) => setEditor({ table }),
        handleCloseEditor: () => setEditor(null),
        handleSubmit,
        handleDelete,
    };

    return <DepositRateCompareContext.Provider value={value}>{children}</DepositRateCompareContext.Provider>;
}

export function useDepositRateCompareContext() {
    const context = useContext(DepositRateCompareContext);
    if (!context) {
        throw new Error("useDepositRateCompareContext must be used within DepositRateCompareContextProvider");
    }
    return context;
}
