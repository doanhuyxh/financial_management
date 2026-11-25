"use client";

import { useEffect, useId, useMemo, useRef } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { ArrowLeft } from "lucide-react";
import AmountInput from "@/components/common/amount-input";
import ChoiceChips from "@/components/common/choice-chips";
import Combobox from "@/components/common/combobox";
import FormField from "@/components/common/form-field";
import Money from "@/components/common/money";
import { Button } from "@/components/shadcn/ui/button";
import { Input } from "@/components/shadcn/ui/input";
import { Spinner } from "@/components/shadcn/ui/spinner";
import ReceiverCard from "@/components/features/scan-pay/components/receiver-card";
import { useScanPayContext } from "@/components/features/scan-pay/context";
import type { IScanPayFormValues } from "@/components/features/scan-pay/context/type";
import type { SelectOptionOrGroup } from "@/libs/interfaces/selectOption";
import { SOURCES_OF_MONEY_TYPE_LABELS } from "@/libs/interfaces/sourcesOfMoneyData";
import { formatMoney } from "@/libs/utils/formatMoney";
import { groupSuggestedOptions } from "@/libs/utils/suggestionOptions";
import { getAvailableAmount } from "@/libs/utils/trackedAmount";

const NOTE_MAX_LENGTH = 500;

/** Vị trí trong danh sách gợi ý; không có thì xếp cuối */
function rank(ids: string[] | undefined, id: string) {
    const index = ids?.indexOf(id) ?? -1;
    return index < 0 ? Number.MAX_SAFE_INTEGER : index;
}

/** Bước 2: xác nhận số tiền, danh mục, nguồn, app ngân hàng → ghi chi tiêu rồi mở app. */
export default function PaymentForm() {
    const {
        qr,
        platform,
        bankApps,
        bankAppsLoading,
        sources,
        categories,
        suggestedCategoryIds,
        suggestedSourceIds,
        isSubmitting,
        getDefaultValues,
        getAppForSource,
        isAutofillApp,
        prepareClipboard,
        submitPayment,
        reset: backToScan,
    } = useScanPayContext();

    const { control, handleSubmit, setValue, getValues, clearErrors, setError } = useForm<IScanPayFormValues>({
        mode: "onChange",
        defaultValues: getDefaultValues(),
    });
    const noteId = useId();
    const sourceId = useWatch({ control, name: "sourceOfMoneyId" });
    const categoryId = useWatch({ control, name: "categoryId" });
    const appId = useWatch({ control, name: "appId" });
    const selectedApp = bankApps.find((item) => item.appId === appId);
    const selectedSource = sources.find((item) => item._id === sourceId);
    const hasQrAmount = qr?.amount != null;

    // Danh sách app tải xong sau khi form mở: điền app của nguồn đang chọn
    const appsReady = bankApps.length > 0;
    useEffect(() => {
        if (appsReady && !getValues("appId") && getValues("sourceOfMoneyId")) {
            setValue("appId", getAppForSource(getValues("sourceOfMoneyId"))?.appId ?? "");
        }
    }, [appsReady]);

    // Đổi nguồn thì đổi app theo nguồn (bỏ qua lần render đầu để giữ giá trị mặc định)
    const prevSourceRef = useRef(sourceId);
    useEffect(() => {
        if (prevSourceRef.current === sourceId) return;
        prevSourceRef.current = sourceId;
        const app = getAppForSource(sourceId);
        if (app) setValue("appId", app.appId);
    }, [sourceId]);

    const categoryOptions = groupSuggestedOptions(
        categories.map((item) => ({ value: item._id, label: item.icon ? `${item.icon} ${item.name}` : item.name })),
        suggestedCategoryIds,
    );
    const categoryChips = useMemo(() => {
        const byId = new Map(categories.map((item) => [item._id, item]));
        return (suggestedCategoryIds ?? [])
            .map((id) => byId.get(id))
            .filter((item): item is NonNullable<typeof item> => Boolean(item))
            .slice(0, 5)
            .map((item) => ({ value: item._id, label: item.icon ? `${item.icon} ${item.name}` : item.name }));
    }, [categories, suggestedCategoryIds]);

    const sourceOptions = groupSuggestedOptions(
        sources.map((item) => ({
            value: item._id,
            label: `${item.name} (${SOURCES_OF_MONEY_TYPE_LABELS[item.type]})`,
        })),
        suggestedSourceIds,
    );
    const sourceChips = useMemo(
        () =>
            // Nguồn hay dùng lên trước
            [...sources]
                .sort((a, b) => rank(suggestedSourceIds, a._id) - rank(suggestedSourceIds, b._id))
                .slice(0, 4)
                .map((item) => ({
                value: item._id,
                label: item.name,
                hint: formatMoney(getAvailableAmount(item)),
                })),
        [sources, suggestedSourceIds],
    );

    const appOptions = useMemo((): SelectOptionOrGroup[] => {
        const toOption = (item: (typeof bankApps)[number]) => ({ value: item.appId, label: item.appName });
        return [
            { title: "autofill", label: "Điền sẵn lệnh chuyển", options: bankApps.filter(isAutofillApp).map(toOption) },
            {
                title: "open",
                label: "Chỉ mở app",
                options: bankApps.filter((item) => !isAutofillApp(item)).map(toOption),
            },
        ].filter((group) => group.options.length > 0);
    }, [bankApps, isAutofillApp]);

    const onValid = async (values: IScanPayFormValues) => {
        const amount = Number(values.amount);
        if (!Number.isInteger(amount) || amount <= 0) {
            setError("amount", { message: "Số tiền phải là số nguyên lớn hơn 0" });
            return;
        }
        await submitPayment(values);
    };

    const handleClick = () => {
        // Copy số TK ngay trong lúc bấm (Safari chặn ghi clipboard sau khi chờ API)
        prepareClipboard(getValues("appId"));
        void handleSubmit(onValid)();
    };

    if (!qr) return null;

    const submitLabel = selectedApp ? `Ghi chi & mở ${selectedApp.appName}` : "Ghi chi tiêu";

    return (
        <form
            className="mx-auto flex w-full max-w-md flex-col gap-4"
            onSubmit={(event) => {
                event.preventDefault();
                handleClick();
            }}
        >
            <ReceiverCard />

            <Controller
                name="amount"
                control={control}
                rules={{ required: "Số tiền là bắt buộc" }}
                render={({ field, fieldState }) => (
                    <FormField
                        label="Số tiền"
                        error={fieldState.error?.message}
                        extra={hasQrAmount ? "Số tiền có sẵn trong mã QR" : undefined}
                    >
                        {hasQrAmount ? (
                            <Money value={qr.amount ?? 0} className="text-2xl font-semibold" />
                        ) : (
                            <AmountInput value={field.value} onChange={field.onChange} />
                        )}
                    </FormField>
                )}
            />

            <Controller
                name="categoryId"
                control={control}
                rules={{ required: "Danh mục là bắt buộc" }}
                render={({ field, fieldState }) => (
                    <FormField label="Danh mục" error={fieldState.error?.message}>
                        <div className="flex flex-col gap-2">
                            <ChoiceChips
                                label="Thường dùng:"
                                options={categoryChips}
                                value={categoryId}
                                onChange={(value) => {
                                    field.onChange(value);
                                    clearErrors("categoryId");
                                }}
                            />
                            <Combobox
                                value={field.value}
                                onChange={(value) => field.onChange(value ?? "")}
                                options={categoryOptions}
                                placeholder={categoryChips.length ? "Hoặc chọn danh mục khác" : "Chọn danh mục"}
                            />
                        </div>
                    </FormField>
                )}
            />

            <Controller
                name="sourceOfMoneyId"
                control={control}
                rules={{ required: "Nguồn tiền là bắt buộc" }}
                render={({ field, fieldState }) => (
                    <FormField
                        label="Chuyển từ"
                        error={fieldState.error?.message}
                        extra={
                            selectedSource ? (
                                <span className="money-value">
                                    Số dư khả dụng: {formatMoney(getAvailableAmount(selectedSource))}
                                </span>
                            ) : sources.length === 0 ? (
                                "Chưa có nguồn ngân hàng / ví nào. Thêm ở trang Nguồn tiền."
                            ) : undefined
                        }
                    >
                        <div className="flex flex-col gap-2">
                            <ChoiceChips
                                options={sourceChips}
                                value={sourceId}
                                onChange={(value) => {
                                    field.onChange(value);
                                    clearErrors("sourceOfMoneyId");
                                }}
                            />
                            {sources.length > sourceChips.length ? (
                                <Combobox
                                    value={field.value}
                                    onChange={(value) => field.onChange(value ?? "")}
                                    options={sourceOptions}
                                    placeholder="Hoặc chọn nguồn khác"
                                />
                            ) : null}
                        </div>
                    </FormField>
                )}
            />

            {platform ? (
                <Controller
                    name="appId"
                    control={control}
                    render={({ field }) => (
                        <FormField
                            label="Mở app ngân hàng"
                            extra={
                                !selectedApp
                                    ? "Không chọn: chỉ ghi chi tiêu"
                                    : isAutofillApp(selectedApp)
                                      ? "App mở sẵn lệnh chuyển (người nhận, số tiền, nội dung): bạn chỉ cần xác nhận"
                                      : "App này chưa điền sẵn được: web copy số tài khoản để bạn dán vào app"
                            }
                        >
                            <Combobox
                                value={field.value}
                                onChange={(value) => field.onChange(value ?? "")}
                                options={appOptions}
                                placeholder="Chọn app ngân hàng"
                                loading={bankAppsLoading}
                                allowClear
                            />
                        </FormField>
                    )}
                />
            ) : (
                <p className="text-sm text-muted-foreground">
                    Mở app ngân hàng chỉ dùng được trên điện thoại. Ở máy tính, web chỉ ghi chi tiêu.
                </p>
            )}

            <Controller
                name="note"
                control={control}
                render={({ field }) => (
                    <FormField
                        label="Nội dung"
                        htmlFor={noteId}
                        extra={
                            selectedApp && isAutofillApp(selectedApp)
                                ? "Ghi chú chi tiêu, đồng thời là nội dung chuyển khoản (bỏ dấu, tối đa 50 ký tự)"
                                : "Ghi chú chi tiêu"
                        }
                    >
                        <Input {...field} id={noteId} maxLength={NOTE_MAX_LENGTH} placeholder="Không bắt buộc" />
                    </FormField>
                )}
            />

            <div className="flex flex-col gap-2 pt-1">
                <Button type="submit" size="lg" disabled={isSubmitting || sources.length === 0}>
                    {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
                    {submitLabel}
                </Button>
                <Button type="button" variant="ghost" onClick={backToScan} disabled={isSubmitting}>
                    <ArrowLeft data-icon="inline-start" />
                    Quét mã khác
                </Button>
            </div>
        </form>
    );
}
