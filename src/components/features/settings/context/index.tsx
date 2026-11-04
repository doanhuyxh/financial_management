"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { useAppFeedback } from "@/libs/hooks/useAppFeedback";
import { useGetSettings, useUpdateSettings } from "@/libs/hooks/customHooks/useSettings";
import { useGetTransactionAudits } from "@/libs/hooks/customHooks/useTransactionAudits";
import type { TransactionAuditKind } from "@/libs/interfaces/transactionAuditsData";
import { formatDate } from "@/libs/utils/formatDate";
import type { ISettingsContextProps } from "./type";

const AUDIT_PAGE_SIZE = 20;
const DAY_FORMAT = "YYYY-MM-DD";

const SettingsContext = createContext<ISettingsContextProps | undefined>(undefined);

function getErrorMessage(error: unknown, fallback: string) {
    if (error && typeof error === "object" && "message" in error) {
        return String((error as { message?: string }).message);
    }
    return fallback;
}

export default function SettingsContextProvider({ children }: { children: React.ReactNode }) {
    const { notification, modal } = useAppFeedback();

    // ----- Khóa sổ
    const { data: settingsResponse, isLoading: isSettingsLoading } = useGetSettings();
    const { mutateAsync: updateSettings, isPending: isSavingLock } = useUpdateSettings();
    const savedLock = settingsResponse?.data?.ledgerLockedBefore ?? null;
    const savedLockDay = savedLock ? dayjs(savedLock).format(DAY_FORMAT) : null;
    const [lockInput, setLockInput] = useState("");
    const maxLockDay = dayjs().add(1, "day").format(DAY_FORMAT);

    // Đồng bộ ô ngày với mốc đã lưu khi tải xong / sau khi lưu
    useEffect(() => {
        setLockInput(savedLockDay ?? "");
    }, [savedLockDay]);

    const saveLock = useCallback(
        async (day: string | null) => {
            try {
                await updateSettings({ ledgerLockedBefore: day });
                notification.success({
                    title: day ? `Đã khóa sổ trước ${formatDate(day)}` : "Đã bỏ khóa sổ",
                });
            } catch (error: unknown) {
                notification.error({ title: getErrorMessage(error, "Lưu khóa sổ thất bại") });
            }
        },
        [notification, updateSettings],
    );

    const handleSaveLock = useCallback(() => {
        if (!lockInput) {
            notification.warning({ title: "Chọn ngày khóa sổ" });
            return;
        }
        modal.confirm({
            title: `Khóa sổ trước ngày ${formatDate(lockInput)}?`,
            content:
                "Giao dịch có ngày trước mốc này sẽ không thêm, sửa hoặc xóa được (chi tiêu, thu nhập, chuyển tiền, đáo hạn). Có thể bỏ khóa bất cứ lúc nào.",
            okText: "Khóa sổ",
            onOk: () => saveLock(lockInput),
        });
    }, [lockInput, modal, notification, saveLock]);

    const handleClearLock = useCallback(() => {
        modal.confirm({
            title: "Bỏ khóa sổ?",
            content: "Mọi giao dịch cũ sẽ sửa và xóa được trở lại.",
            okText: "Bỏ khóa",
            okType: "danger",
            onOk: () => saveLock(null),
        });
    }, [modal, saveLock]);

    // ----- Lịch sử sửa/xóa
    const [auditKind, setAuditKind] = useState<TransactionAuditKind | "">("");
    const [auditPage, setAuditPage] = useState(1);
    const auditQuery = useMemo(
        () => ({ page: auditPage, limit: AUDIT_PAGE_SIZE, kind: auditKind || undefined }),
        [auditKind, auditPage],
    );
    const { data: auditsResponse, isLoading: isAuditsLoading } = useGetTransactionAudits(auditQuery);
    const audits = auditsResponse?.data;

    const handleAuditKindChange = useCallback((kind: TransactionAuditKind | "") => {
        setAuditKind(kind);
        setAuditPage(1);
    }, []);

    const value: ISettingsContextProps = {
        savedLockDay,
        lockInput,
        maxLockDay,
        isSettingsLoading,
        isSavingLock,
        setLockInput,
        handleSaveLock,
        handleClearLock,
        auditKind,
        auditItems: audits?.items ?? [],
        auditNames: audits?.names ?? {},
        auditPage,
        auditTotalPages: audits?.pagination.totalPages ?? 0,
        auditTotal: audits?.pagination.total ?? 0,
        isAuditsLoading,
        handleAuditKindChange,
        handleAuditPageChange: setAuditPage,
    };

    return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettingsContext() {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error("useSettingsContext must be used within SettingsContextProvider");
    }
    return context;
}
