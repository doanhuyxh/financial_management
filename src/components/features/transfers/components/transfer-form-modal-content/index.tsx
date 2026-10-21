"use client";

import { useEffect, useMemo, useState } from "react";
import { DatePicker, Form, Input, Select, Switch } from "antd";
import ResponsiveModal from "@/components/common/responsive-modal";
import dayjs from "dayjs";
import DebouncedNumberInput from "@/components/common/input/DebouncedNumberInput";
import AmountSuggestionChips from "@/components/common/amount-suggestion-chips";
import TransferPairSuggestions from "@/components/features/transfers/components/transfer-pair-suggestions";
import { formatMoney } from "@/components/features/transfers/utils";
import { useGetCategories } from "@/libs/hooks/customHooks/useCategories";
import { useGetSourcesOfMoney } from "@/libs/hooks/customHooks/useSourcesOfMoney";
import { useGetTransferSuggestions } from "@/libs/hooks/customHooks/useTransfers";
import type { IFromTransfersData } from "@/libs/interfaces/transfersData";
import type { ITransferPairSuggestion } from "@/libs/interfaces/suggestionsData";
import {
    SOURCES_OF_MONEY_TYPE_LABELS,
    SourcesOfMoneyType,
    type ISourcesOfMoneyData,
} from "@/libs/interfaces/sourcesOfMoneyData";
import { groupSuggestedOptions } from "@/libs/utils/suggestionOptions";

type FormValues = {
    fromSourceId: string;
    toSourceId: string;
    amount: string | number | null;
    feePercent?: string | number | null;
    feeCategoryId?: string;
    note?: string;
    transferredAt: dayjs.Dayjs;
};

export type TransferFormModalContentProps = {
    open: boolean;
    isSubmitting: boolean;
    onClose: () => void;
    onSubmit: (
        values: IFromTransfersData,
        options?: { keepOpen?: boolean },
    ) => Promise<boolean>;
};

function getAvailableOut(source?: ISourcesOfMoneyData | null) {
    if (!source) return null;
    if (source.type === SourcesOfMoneyType.CREDIT_CARD) {
        const limit = source.creditDetails?.creditLimit ?? 0;
        const debt = source.creditDetails?.currentDebt ?? 0;
        return Math.max(0, limit - debt);
    }
    return source.balance ?? 0;
}

function getMaxToCredit(source?: ISourcesOfMoneyData | null) {
    if (!source || source.type !== SourcesOfMoneyType.CREDIT_CARD) return null;
    return source.creditDetails?.currentDebt ?? 0;
}

function resetCreateForm(form: ReturnType<typeof Form.useForm<FormValues>>[0]) {
    form.resetFields();
    form.setFieldsValue({
        transferredAt: dayjs(),
        amount: "",
        feePercent: 0,
        note: "",
        feeCategoryId: undefined,
    });
}

export default function TransferFormModalContent({
    open,
    isSubmitting,
    onClose,
    onSubmit,
}: TransferFormModalContentProps) {
    const [form] = Form.useForm<FormValues>();
    const [keepCreating, setKeepCreating] = useState(false);

    const fromSourceId = Form.useWatch("fromSourceId", form);
    const toSourceId = Form.useWatch("toSourceId", form);
    const amountWatch = Form.useWatch("amount", form);
    const feePercentWatch = Form.useWatch("feePercent", form);

    const { data: categoriesData, isLoading: categoriesLoading } = useGetCategories({
        page: 1,
        limit: 100,
    });
    const { data: sourcesData, isLoading: sourcesLoading } = useGetSourcesOfMoney({
        page: 1,
        limit: 100,
    });
    const { data: suggestionsData } = useGetTransferSuggestions(open);
    const suggestions = suggestionsData?.data;

    const sources = sourcesData?.data?.items ?? [];

    const fromSource = useMemo(
        () => sources.find((item) => item._id === fromSourceId) ?? null,
        [sources, fromSourceId],
    );
    const toSource = useMemo(
        () => sources.find((item) => item._id === toSourceId) ?? null,
        [sources, toSourceId],
    );

    const fromIsCredit = fromSource?.type === SourcesOfMoneyType.CREDIT_CARD;
    const toIsCredit = toSource?.type === SourcesOfMoneyType.CREDIT_CARD;

    const amount = Number(amountWatch) || 0;
    const feePercent = fromIsCredit ? Number(feePercentWatch) || 0 : 0;
    const feeAmount =
        fromIsCredit && feePercent > 0
            ? Math.round((amount * feePercent) / 100)
            : 0;
    const receiveAmount = fromIsCredit ? Math.max(0, amount - feeAmount) : amount;

    const availableOut = getAvailableOut(fromSource);
    const maxToCredit = getMaxToCredit(toSource);

    const categoryOptions = (categoriesData?.data?.items ?? []).map((item) => ({
        value: item._id,
        label: item.name,
    }));

    const sourceOptions = sources.map((item) => ({
        value: item._id,
        label: `${item.name} (${SOURCES_OF_MONEY_TYPE_LABELS[item.type]})`,
    }));

    const fromOptions = groupSuggestedOptions(sourceOptions, suggestions?.fromSourceIds);

    const pairsFromSelected = (suggestions?.pairs ?? []).filter(
        (pair) => pair.fromSourceId === fromSourceId,
    );
    const selectedPair = pairsFromSelected.find((pair) => pair.toSourceId === toSourceId);

    // Chưa chọn nguồn thì gợi ý số tiền chung; đã chọn đúng cặp quen thì gợi ý theo cặp
    const amountSuggestions = selectedPair
        ? selectedPair.amounts
        : !fromSourceId
          ? suggestions?.topAmounts
          : undefined;

    const handleFromChange = (nextFromId?: string) => {
        if (!nextFromId || form.getFieldValue("toSourceId")) return;
        const suggestedPair = suggestions?.pairs.find(
            (pair) =>
                pair.fromSourceId === nextFromId &&
                sources.some((item) => item._id === pair.toSourceId),
        );
        if (suggestedPair) {
            form.setFieldValue("toSourceId", suggestedPair.toSourceId);
        }
    };

    const handlePairSelect = (pair: ITransferPairSuggestion) => {
        form.setFields([
            { name: "fromSourceId", value: pair.fromSourceId, errors: [] },
            { name: "toSourceId", value: pair.toSourceId, errors: [] },
        ]);
    };

    const handleAmountSuggestion = (value: number) => {
        form.setFields([{ name: "amount", value: String(value), errors: [] }]);
    };

    const toOptionsFlat = sourceOptions.filter((opt) => {
        if (opt.value === fromSourceId) return false;
        // Disallow CC → CC
        if (fromIsCredit) {
            const target = sources.find((s) => s._id === opt.value);
            return target?.type !== SourcesOfMoneyType.CREDIT_CARD;
        }
        return true;
    });
    const toOptions = groupSuggestedOptions(
        toOptionsFlat,
        pairsFromSelected.map((pair) => pair.toSourceId),
    );

    useEffect(() => {
        if (!open) {
            setKeepCreating(false);
            return;
        }
        resetCreateForm(form);
    }, [open, form]);

    useEffect(() => {
        if (!fromIsCredit) {
            form.setFieldsValue({ feePercent: 0, feeCategoryId: undefined });
        }
    }, [fromIsCredit, form]);

    useEffect(() => {
        if (toIsCredit && fromIsCredit) {
            form.setFieldValue("toSourceId", undefined);
        }
    }, [toIsCredit, fromIsCredit, form]);

    const handleOk = async () => {
        const values = await form.validateFields();
        const parsedAmount = Number(values.amount);
        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
            form.setFields([{ name: "amount", errors: ["Số tiền phải lớn hơn 0"] }]);
            return;
        }

        const selectedFrom = sources.find((s) => s._id === values.fromSourceId);
        const selectedTo = sources.find((s) => s._id === values.toSourceId);
        if (!selectedFrom || !selectedTo) return;

        if (
            selectedFrom.type === SourcesOfMoneyType.CREDIT_CARD &&
            selectedTo.type === SourcesOfMoneyType.CREDIT_CARD
        ) {
            form.setFields([
                {
                    name: "toSourceId",
                    errors: ["Không hỗ trợ chuyển giữa hai thẻ tín dụng"],
                },
            ]);
            return;
        }

        const parsedFeePercent =
            selectedFrom.type === SourcesOfMoneyType.CREDIT_CARD
                ? Number(values.feePercent) || 0
                : 0;
        const parsedFeeAmount =
            parsedFeePercent > 0
                ? Math.round((parsedAmount * parsedFeePercent) / 100)
                : 0;

        if (selectedTo.type === SourcesOfMoneyType.CREDIT_CARD) {
            const debt = selectedTo.creditDetails?.currentDebt ?? 0;
            if (parsedAmount > debt) {
                form.setFields([
                    {
                        name: "amount",
                        errors: [
                            `Tối đa bằng dư nợ đang nợ (${formatMoney(debt)})`,
                        ],
                    },
                ]);
                return;
            }
        }

        if (
            selectedFrom.type === SourcesOfMoneyType.CREDIT_CARD &&
            parsedFeeAmount > 0 &&
            !values.feeCategoryId
        ) {
            form.setFields([
                {
                    name: "feeCategoryId",
                    errors: ["Danh mục chi tiêu phí là bắt buộc"],
                },
            ]);
            return;
        }

        const payload: IFromTransfersData = {
            fromSourceId: values.fromSourceId,
            toSourceId: values.toSourceId,
            amount: parsedAmount,
            feePercent: parsedFeePercent,
            feeCategoryId: parsedFeeAmount > 0 ? values.feeCategoryId : undefined,
            note: values.note?.trim() || "",
            transferredAt: values.transferredAt.toISOString(),
        };

        const success = await onSubmit(payload, { keepOpen: keepCreating });
        if (success && keepCreating) {
            // Giữ lại ngày đã chọn để nhập nhanh nhiều khoản trong cùng ngày
            form.resetFields([
                "fromSourceId",
                "toSourceId",
                "amount",
                "feePercent",
                "feeCategoryId",
                "note",
            ]);
            form.setFieldsValue({
                amount: "",
                feePercent: 0,
                note: "",
                feeCategoryId: undefined,
            });
        }
    };

    let amountExtra: string | undefined;
    if (toIsCredit && maxToCredit != null) {
        amountExtra = `Tối đa trả nợ: ${formatMoney(maxToCredit)}`;
    } else if (fromSource && availableOut != null) {
        amountExtra = fromIsCredit
            ? `Hạn mức còn lại: ${formatMoney(availableOut)}`
            : `Số dư hiện có: ${formatMoney(availableOut)}`;
    }

    return (
        <ResponsiveModal
            title="Chuyển tiền"
            open={open}
            onCancel={onClose}
            onOk={handleOk}
            confirmLoading={isSubmitting}
            destroyOnHidden
            okText="Chuyển tiền"
            cancelText="Hủy"
            width={520}
            footer={(_, { OkBtn, CancelBtn }) => (
                <div className="flex flex-col-reverse gap-2 md:flex-row md:items-center md:justify-between">
                    <label className="flex items-center gap-2 text-sm text-neutral-600">
                        <Switch
                            size="small"
                            checked={keepCreating}
                            onChange={setKeepCreating}
                        />
                        Tạo tiếp
                    </label>
                    <div className="flex flex-col-reverse gap-2 md:flex-row md:items-center">
                        <CancelBtn />
                        <OkBtn />
                    </div>
                </div>
            )}
        >
            <Form form={form} layout="vertical" className="mt-4">
                <TransferPairSuggestions
                    pairs={suggestions?.pairs}
                    sources={sources}
                    fromSourceId={fromSourceId}
                    toSourceId={toSourceId}
                    onSelect={handlePairSelect}
                />

                <Form.Item
                    name="transferredAt"
                    label="Ngày chuyển"
                    rules={[{ required: true, message: "Ngày chuyển là bắt buộc" }]}
                >
                    <DatePicker inputReadOnly className="w-full" format="DD/MM/YYYY" />
                </Form.Item>

                <Form.Item
                    name="fromSourceId"
                    label="Từ nguồn"
                    rules={[{ required: true, message: "Nguồn chuyển là bắt buộc" }]}
                    extra={
                        fromSource
                            ? fromIsCredit
                                ? `Hạn mức còn lại: ${formatMoney(availableOut)}`
                                : `Số dư: ${formatMoney(availableOut)}`
                            : undefined
                    }
                >
                    <Select
                        showSearch
                        optionFilterProp="label"
                        placeholder="Chọn nguồn chuyển"
                        loading={sourcesLoading}
                        options={fromOptions}
                        onChange={handleFromChange}
                    />
                </Form.Item>

                <Form.Item
                    name="toSourceId"
                    label="Đến nguồn"
                    rules={[{ required: true, message: "Nguồn nhận là bắt buộc" }]}
                    extra={
                        toIsCredit && maxToCredit != null
                            ? `Dư nợ đang nợ: ${formatMoney(maxToCredit)}`
                            : toSource
                              ? `Số dư: ${formatMoney(toSource.balance ?? 0)}`
                              : undefined
                    }
                >
                    <Select
                        showSearch
                        optionFilterProp="label"
                        placeholder="Chọn nguồn nhận"
                        loading={sourcesLoading}
                        options={toOptions}
                    />
                </Form.Item>

                <Form.Item
                    name="amount"
                    label="Số tiền"
                    rules={[{ required: true, message: "Số tiền là bắt buộc" }]}
                    extra={
                        amountExtra || amountSuggestions?.length ? (
                            <>
                                {amountExtra}
                                <AmountSuggestionChips
                                    amounts={amountSuggestions}
                                    value={amountWatch}
                                    onSelect={handleAmountSuggestion}
                                />
                            </>
                        ) : undefined
                    }
                >
                    <DebouncedNumberInput min={0} placeholder="0" delay={300} />
                </Form.Item>

                {fromIsCredit && !toIsCredit ? (
                    <>
                        <Form.Item
                            name="feePercent"
                            label="% phí chuyển đổi"
                            extra={
                                amount > 0
                                    ? `Phí: ${formatMoney(feeAmount)} · Nhận thực tế: ${formatMoney(receiveAmount)}`
                                    : "Phí trừ vào số tiền nhận; dư nợ thẻ tăng đúng số tiền chuyển"
                            }
                        >
                            <DebouncedNumberInput
                                min={0}
                                max={100}
                                placeholder="0"
                                delay={300}
                            />
                        </Form.Item>

                        <Form.Item
                            name="feeCategoryId"
                            label="Danh mục chi tiêu phí"
                            rules={[
                                {
                                    required: feePercent > 0,
                                    message: "Danh mục chi tiêu phí là bắt buộc",
                                },
                            ]}
                            extra={
                                feePercent > 0
                                    ? "Phí sẽ được ghi nhận là một khoản chi tiêu"
                                    : "Chỉ bắt buộc khi % phí > 0"
                            }
                        >
                            <Select
                                showSearch
                                allowClear
                                optionFilterProp="label"
                                placeholder="Chọn danh mục"
                                loading={categoriesLoading}
                                options={categoryOptions}
                            />
                        </Form.Item>
                    </>
                ) : null}

                <Form.Item name="note" label="Ghi chú">
                    <Input.TextArea
                        rows={3}
                        maxLength={500}
                        placeholder="Ghi chú (không bắt buộc)"
                        showCount
                    />
                </Form.Item>
            </Form>
        </ResponsiveModal>
    );
}
