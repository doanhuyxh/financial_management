"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAppFeedback } from "@/libs/hooks/useAppFeedback";
import useLocalStorage from "@/libs/hooks/useLocalStorage";
import { configLocalStorageKey, configSessionKey } from "@/libs/constants/configKey";
import { MENU_KEY } from "@/libs/constants/menuKey";
import { useGetCategories } from "@/libs/hooks/customHooks/useCategories";
import { useCreateExpense, useGetExpenseSuggestions } from "@/libs/hooks/customHooks/useExpenses";
import { useGetSourcesOfMoney } from "@/libs/hooks/customHooks/useSourcesOfMoney";
import { useVietQrBankApps, useVietQrBanks } from "@/libs/hooks/customHooks/useVietQrBanks";
import { CategoryKind } from "@/libs/interfaces/categoriesData";
import type { IVietQrBankApp } from "@/libs/interfaces/sourcesOfMoneyData";
import type { BankAppPlatform } from "@/libs/networkApi/vietqr.api";
import { filterCategoriesByKind } from "@/libs/utils/categoryKind";
import {
    buildBankAppDeeplink,
    findBankAppByCode,
    parseVietQrPayload,
    type IParsedVietQr,
} from "@/libs/utils/vietQr";
import type {
    IScanPayContextProps,
    IScanPayFormValues,
    IScanPayResult,
    ScanPayStep,
} from "@/components/features/scan-pay/context/type";
import {
    canPayByTransfer,
    copyText,
    detectPlatform,
    EMPTY_SCAN_PAY_MEMORY,
    MAX_REMEMBERED_RECIPIENTS,
    recipientKey,
    type IScanPayMemory,
} from "@/components/features/scan-pay/utils";

const ScanPayContext = createContext<IScanPayContextProps | undefined>(undefined);

/** Quay lại từ app ngân hàng trong chừng này thời gian thì vẫn hiện màn "đã ghi" */
const LAST_RESULT_TTL_MS = 15 * 60 * 1000;

interface IStoredResult {
    qr: IParsedVietQr;
    result: IScanPayResult;
    savedAt: number;
}

function readStoredResult(): IStoredResult | null {
    try {
        const raw = sessionStorage.getItem(configSessionKey.SCAN_PAY_LAST_RESULT);
        const stored = raw ? (JSON.parse(raw) as IStoredResult) : null;
        return stored && Date.now() - stored.savedAt < LAST_RESULT_TTL_MS ? stored : null;
    } catch {
        return null;
    }
}

function writeStoredResult(value: IStoredResult | null) {
    try {
        if (value) sessionStorage.setItem(configSessionKey.SCAN_PAY_LAST_RESULT, JSON.stringify(value));
        else sessionStorage.removeItem(configSessionKey.SCAN_PAY_LAST_RESULT);
    } catch {
        // Trình duyệt chặn storage: chỉ mất khả năng khôi phục màn "đã ghi"
    }
}

function getErrorMessage(error: unknown, fallback: string) {
    if (error && typeof error === "object" && "message" in error) {
        return String((error as { message?: string }).message);
    }
    return fallback;
}

export default function ScanPayContextProvider({ children }: { children: React.ReactNode }) {
    const { notification } = useAppFeedback();
    const [step, setStep] = useState<ScanPayStep>("scan");
    const [qr, setQr] = useState<IParsedVietQr | null>(null);
    const [result, setResult] = useState<IScanPayResult | null>(null);
    const [platform, setPlatform] = useState<BankAppPlatform | null>(null);
    const [memory, setMemory] = useLocalStorage<IScanPayMemory>(
        configLocalStorageKey.SCAN_PAY_MEMORY,
        EMPTY_SCAN_PAY_MEMORY,
    );
    // Kết quả copy số TK trong lúc bấm nút, dùng khi hiện màn "đã ghi"
    const accountCopiedRef = useRef<Promise<boolean> | null>(null);

    // navigator / sessionStorage chỉ có ở client: đọc sau khi mount để không lệch HTML server.
    // Mở app ngân hàng là rời trang; quay lại mà trang bị tải lại thì khôi phục màn "đã ghi".
    useEffect(() => {
        setPlatform(detectPlatform());
        const stored = readStoredResult();
        if (stored) {
            setQr(stored.qr);
            setResult(stored.result);
            setStep("done");
        }
    }, []);

    const { data: banks } = useVietQrBanks();
    const { data: bankAppsData, isLoading: bankAppsLoading } = useVietQrBankApps(
        platform ?? "android",
        platform !== null,
    );
    const bankApps = bankAppsData ?? EMPTY_APPS;
    const { data: sourcesData, isLoading: sourcesLoading } = useGetSourcesOfMoney({ page: 1, limit: 100 });
    const { data: categoriesData, isLoading: categoriesLoading } = useGetCategories({ page: 1, limit: 100 });
    const { data: suggestionsData } = useGetExpenseSuggestions(step !== "scan");
    const { mutateAsync: createExpense, isPending: isSubmitting } = useCreateExpense();

    const sources = useMemo(
        () => (sourcesData?.data?.items ?? []).filter(canPayByTransfer),
        [sourcesData],
    );
    const categories = useMemo(
        () => filterCategoriesByKind(categoriesData?.data?.items ?? [], CategoryKind.EXPENSE),
        [categoriesData],
    );
    const receiverBank = useMemo(
        () => (qr ? banks?.find((bank) => bank.bin === qr.bin) : undefined),
        [banks, qr],
    );

    const getAppForSource = useCallback(
        (sourceId: string) => {
            const chosen = memory.appBySource[sourceId];
            if (chosen) {
                const app = bankApps.find((item) => item.appId === chosen);
                if (app) return app;
            }
            const bin = sources.find((item) => item._id === sourceId)?.bankAccount?.bin;
            const code = bin ? banks?.find((bank) => bank.bin === bin)?.code : undefined;
            return findBankAppByCode(bankApps, code);
        },
        [memory.appBySource, bankApps, sources, banks],
    );

    // Điền sẵn cần mã ngân hàng người nhận; QR số thẻ không điền sẵn qua deeplink được
    const isAutofillApp = useCallback(
        (app?: IVietQrBankApp) => Boolean(app?.autofill === 1 && receiverBank?.code && !qr?.isCard),
        [receiverBank, qr],
    );

    const getDefaultValues = useCallback((): IScanPayFormValues => {
        const remembered = qr ? memory.recipients[recipientKey(qr.bin, qr.accountNumber)] : undefined;
        const isUsableSource = (id?: string) => Boolean(id && sources.some((item) => item._id === id));
        const sourceOfMoneyId =
            [
                remembered?.sourceId,
                memory.lastSourceId,
                suggestionsData?.data?.sourceIds?.[0],
                sources[0]?._id,
            ].find(isUsableSource) ?? "";
        const categoryId =
            remembered && categories.some((item) => item._id === remembered.categoryId)
                ? remembered.categoryId
                : "";
        return {
            amount: qr?.amount != null ? String(qr.amount) : "",
            categoryId,
            sourceOfMoneyId,
            appId: sourceOfMoneyId ? (getAppForSource(sourceOfMoneyId)?.appId ?? "") : "",
            note: qr?.note ?? "",
        };
    }, [qr, memory, sources, categories, suggestionsData, getAppForSource]);

    const handleDetected = useCallback((text: string) => {
        const parsed = parseVietQrPayload(text);
        if (!parsed.ok) return parsed.error;
        writeStoredResult(null);
        setQr(parsed.data);
        setResult(null);
        setStep("confirm");
        return null;
    }, []);

    const prepareClipboard = useCallback(
        (appId: string) => {
            const app = bankApps.find((item) => item.appId === appId);
            accountCopiedRef.current =
                qr && app && !isAutofillApp(app) ? copyText(qr.accountNumber) : null;
        },
        [bankApps, qr, isAutofillApp],
    );

    const submitPayment = useCallback(
        async (values: IScanPayFormValues) => {
            if (!qr) return;
            const amount = Number(values.amount);
            const note = values.note.trim();
            try {
                await createExpense({
                    categoryId: values.categoryId,
                    sourceOfMoneyId: values.sourceOfMoneyId,
                    amount,
                    note,
                    spentAt: new Date().toISOString(),
                });
            } catch (error: unknown) {
                notification.error({ title: getErrorMessage(error, "Ghi chi tiêu thất bại") });
                return;
            }

            const app = bankApps.find((item) => item.appId === values.appId);
            const autoApp = getAppForSource(values.sourceOfMoneyId);
            setMemory((prev) => {
                const recipients = {
                    ...prev.recipients,
                    [recipientKey(qr.bin, qr.accountNumber)]: {
                        categoryId: values.categoryId,
                        sourceId: values.sourceOfMoneyId,
                        usedAt: Date.now(),
                    },
                };
                const trimmed = Object.entries(recipients)
                    .sort(([, a], [, b]) => b.usedAt - a.usedAt)
                    .slice(0, MAX_REMEMBERED_RECIPIENTS);
                const appBySource = { ...prev.appBySource };
                // Chỉ nhớ khi chọn khác app tự ghép, để đổi số TK nguồn sau này vẫn ghép lại đúng
                if (app && app.appId !== autoApp?.appId) appBySource[values.sourceOfMoneyId] = app.appId;
                return {
                    lastSourceId: values.sourceOfMoneyId,
                    appBySource,
                    recipients: Object.fromEntries(trimmed),
                };
            });

            const autofill = isAutofillApp(app);
            const deeplink = app
                ? buildBankAppDeeplink({
                      appId: app.appId,
                      autofill,
                      accountNumber: qr.accountNumber,
                      receiverBankCode: receiverBank?.code,
                      amount,
                      note,
                      receiverName: qr.receiverName,
                      returnUrl: `${window.location.origin}${MENU_KEY.SCAN_PAY}`,
                  })
                : undefined;
            const accountCopied = (await accountCopiedRef.current) ?? false;
            accountCopiedRef.current = null;

            const nextResult: IScanPayResult = { amount, note, app, deeplink, autofill, accountCopied };
            writeStoredResult({ qr, result: nextResult, savedAt: Date.now() });
            setResult(nextResult);
            setStep("done");
            notification.success({ title: "Đã ghi chi tiêu" });
            if (deeplink) window.location.href = deeplink;
        },
        [qr, createExpense, notification, bankApps, getAppForSource, setMemory, isAutofillApp, receiverBank],
    );

    const openBankApp = useCallback(() => {
        if (result?.deeplink) window.location.href = result.deeplink;
    }, [result]);

    const reset = useCallback(() => {
        writeStoredResult(null);
        setQr(null);
        setResult(null);
        setStep("scan");
    }, []);

    const value: IScanPayContextProps = {
        step,
        qr,
        receiverBank,
        platform,
        bankApps,
        bankAppsLoading: platform !== null && bankAppsLoading,
        sources,
        categories,
        suggestedCategoryIds: suggestionsData?.data?.categoryIds,
        suggestedSourceIds: suggestionsData?.data?.sourceIds,
        isDataLoading: sourcesLoading || categoriesLoading,
        isSubmitting,
        result,
        getDefaultValues,
        getAppForSource,
        isAutofillApp,
        handleDetected,
        prepareClipboard,
        submitPayment,
        openBankApp,
        reset,
    };

    return <ScanPayContext.Provider value={value}>{children}</ScanPayContext.Provider>;
}

const EMPTY_APPS: IVietQrBankApp[] = [];

export function useScanPayContext() {
    const context = useContext(ScanPayContext);
    if (!context) throw new Error("useScanPayContext must be used within ScanPayContextProvider");
    return context;
}
