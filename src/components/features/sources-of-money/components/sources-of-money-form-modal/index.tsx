"use client";

import { useEffect, useMemo, useState } from "react";
import { Avatar, Form, Input, Select } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import ResponsiveModal from "@/components/common/responsive-modal";
import { useSourcesOfMoneyContext } from "@/components/features/sources-of-money/context";
import {
    SOURCES_OF_MONEY_TYPE_LABELS,
    SourcesOfMoneyType,
    type IFromSourcesOfMoneyData,
} from "@/libs/interfaces/sourcesOfMoneyData";
import DebouncedNumberInput from "@/components/common/input/DebouncedNumberInput";
import { getTrackedAmount } from "@/libs/utils/trackedAmount";
import { useVietQrBanks } from "@/libs/hooks/customHooks/useVietQrBanks";
import CreditCardFields from "@/components/features/sources-of-money/components/sources-of-money-form-modal/components/credit-card-fields";
import {
    getSectionsWithErrors,
    numberMinRule,
    RATE_FEE_FIELDS,
    toNumber,
    type CardFeeSectionKey,
    type FormValues,
} from "@/components/features/sources-of-money/components/sources-of-money-form-modal/utils";

const typeOptions = Object.values(SourcesOfMoneyType).map((type) => ({
    value: type,
    label: SOURCES_OF_MONEY_TYPE_LABELS[type],
}));

/** Ngày thu phí chỉ có ngày/tháng; dùng năm nhuận để hiển thị được 29/02. */
function toAnnualFeeDate(day?: number, month?: number): Dayjs | null {
    if (!day || !month) return null;
    return dayjs(new Date(2024, month - 1, day));
}

export default function SourcesOfMoneyFormModal() {
    const { modalOpen, editingItem, isSubmitting, closeModal, handleSubmit } =
        useSourcesOfMoneyContext();

    const [form] = Form.useForm<FormValues>();
    const selectedType = Form.useWatch("type", form);
    const isEdit = Boolean(editingItem?._id);
    const isCreditCard = selectedType === SourcesOfMoneyType.CREDIT_CARD;
    const balanceWatch = Form.useWatch("balance", form);
    const currentDebtWatch = Form.useWatch("currentDebt", form);
    const [activeFeeSections, setActiveFeeSections] = useState<CardFeeSectionKey[]>([]);
    const isBank = selectedType === SourcesOfMoneyType.BANK;
    const bankBinWatch = Form.useWatch("bankBin", form);
    const accountNumberWatch = Form.useWatch("accountNumber", form);

    const { data: banks = [], isLoading: isBanksLoading, isError: isBanksError } =
        useVietQrBanks(modalOpen && isBank);
    const bankOptions = useMemo(() => {
        const options = banks.map((bank) => ({
            value: bank.bin,
            label: (
                <span className="flex items-center gap-2">
                    <Avatar src={bank.logo} size={20} shape="square" />
                    {bank.shortName}
                </span>
            ),
            bankName: bank.shortName,
            searchText: `${bank.shortName} ${bank.code} ${bank.name}`,
        }));
        // Ngân hàng đã lưu vẫn hiện tên khi chưa tải được danh sách
        const saved = editingItem?.bankAccount;
        if (saved && !options.some((option) => option.value === saved.bin)) {
            options.unshift({
                value: saved.bin,
                label: <span>{saved.bankName}</span>,
                bankName: saved.bankName,
                searchText: saved.bankName,
            });
        }
        return options;
    }, [banks, editingItem]);

    // Số dư (nguồn thường) hoặc dư nợ (thẻ) lúc mở form; server dùng để phát hiện ghi đè
    const expectedAmount = editingItem ? getTrackedAmount(editingItem) : undefined;
    const enteredAmount = toNumber(isCreditCard ? currentDebtWatch : balanceWatch);
    const amountChanged =
        isEdit && enteredAmount !== undefined && enteredAmount !== expectedAmount;

    useEffect(() => {
        if (!modalOpen) return;
        setActiveFeeSections([]);

        if (editingItem) {
            form.setFieldsValue({
                name: editingItem.name,
                type: editingItem.type,
                balance: editingItem.balance,
                creditLimit: editingItem.creditDetails?.creditLimit,
                currentDebt: editingItem.creditDetails?.currentDebt,
                statementDate: editingItem.creditDetails?.statementDate,
                dueDate: editingItem.creditDetails?.dueDate,
                annualFee: editingItem.creditDetails?.annualFee,
                annualFeeDate: toAnnualFeeDate(
                    editingItem.creditDetails?.annualFeeDay,
                    editingItem.creditDetails?.annualFeeMonth,
                ),
                annualFeeWaiverPeriod: editingItem.creditDetails?.annualFeeWaiverPeriod,
                annualFeeWaiverMinSpend: editingItem.creditDetails?.annualFeeWaiverMinSpend,
                managementFee: editingItem.creditDetails?.managementFee,
                managementFeeDay: editingItem.creditDetails?.managementFeeDay,
                managementFeeWaiverMinTransactions:
                    editingItem.creditDetails?.managementFeeWaiverMinTransactions,
                managementFeeWaiverMinSpend: editingItem.creditDetails?.managementFeeWaiverMinSpend,
                paymentFee: editingItem.creditDetails?.paymentFee,
                freePaymentsPerCycle: editingItem.creditDetails?.freePaymentsPerCycle,
                ...Object.fromEntries(
                    RATE_FEE_FIELDS.map(({ name }) => [name, editingItem.creditDetails?.[name]]),
                ),
                bankBin: editingItem.bankAccount?.bin,
                accountNumber: editingItem.bankAccount?.accountNumber,
                accountName: editingItem.bankAccount?.accountName,
            });
        } else {
            form.resetFields();
            form.setFieldsValue({
                type: SourcesOfMoneyType.CASH,
                balance: 0,
                creditLimit: 0,
                currentDebt: 0,
            });
        }
    }, [modalOpen, editingItem, form]);

    const handleOk = async () => {
        let values: FormValues;
        try {
            values = await form.validateFields();
        } catch (error) {
            // Mở các mục phí đang đóng có ô lỗi để người dùng thấy
            const errorFields =
                (error as { errorFields?: { name: (string | number)[] }[] }).errorFields ?? [];
            const sections = getSectionsWithErrors(errorFields.map((field) => field.name[0]));
            if (sections.length > 0) {
                setActiveFeeSections((current) => Array.from(new Set([...current, ...sections])));
            }
            return;
        }
        const payload: IFromSourcesOfMoneyData = {
            name: values.name.trim(),
            type: values.type,
        };

        if (values.type === SourcesOfMoneyType.CREDIT_CARD) {
            payload.creditDetails = {
                creditLimit: toNumber(values.creditLimit) ?? 0,
                currentDebt: toNumber(values.currentDebt) ?? 0,
                statementDate: toNumber(values.statementDate),
                dueDate: toNumber(values.dueDate),
                annualFee: toNumber(values.annualFee),
                annualFeeDay: values.annualFeeDate?.date(),
                annualFeeMonth: values.annualFeeDate ? values.annualFeeDate.month() + 1 : undefined,
                annualFeeWaiverPeriod: values.annualFeeWaiverPeriod ?? undefined,
                annualFeeWaiverMinSpend: values.annualFeeWaiverPeriod
                    ? toNumber(values.annualFeeWaiverMinSpend)
                    : undefined,
                managementFee: toNumber(values.managementFee),
                managementFeeDay: toNumber(values.managementFeeDay),
                managementFeeWaiverMinTransactions: toNumber(
                    values.managementFeeWaiverMinTransactions,
                ),
                managementFeeWaiverMinSpend: toNumber(values.managementFeeWaiverMinSpend),
                paymentFee: toNumber(values.paymentFee),
                freePaymentsPerCycle:
                    toNumber(values.paymentFee) != null
                        ? toNumber(values.freePaymentsPerCycle)
                        : undefined,
                ...Object.fromEntries(
                    RATE_FEE_FIELDS.map(({ name }) => [name, toNumber(values[name])]),
                ),
            };
            payload.balance = 0;
        } else {
            payload.balance = toNumber(values.balance) ?? 0;
        }

        const accountNumber = values.accountNumber?.trim();
        if (values.type === SourcesOfMoneyType.BANK && values.bankBin && accountNumber) {
            payload.bankAccount = {
                bin: values.bankBin,
                bankName:
                    bankOptions.find((option) => option.value === values.bankBin)?.bankName ?? "",
                accountNumber,
                accountName: values.accountName?.trim() || undefined,
            };
        } else {
            payload.bankAccount = null;
        }

        if (isEdit) {
            payload.expectedAmount = expectedAmount;
            if (amountChanged) payload.adjustmentNote = values.adjustmentNote?.trim();
        }

        await handleSubmit(payload);
    };

    return (
        <ResponsiveModal
            title={isEdit ? "Sửa nguồn tiền" : "Thêm nguồn tiền"}
            open={modalOpen}
            onCancel={closeModal}
            onOk={handleOk}
            confirmLoading={isSubmitting}
            destroyOnHidden
            okText={isEdit ? "Cập nhật" : "Tạo mới"}
            cancelText="Hủy"
            width={580}
        >
            <Form form={form} layout="vertical" className="mt-4">
                <Form.Item
                    name="name"
                    label="Tên nguồn tiền"
                    rules={[
                        { required: true, message: "Tên nguồn tiền là bắt buộc" },
                        { max: 100, message: "Tên tối đa 100 ký tự" },
                    ]}
                >
                    <Input placeholder="Ví dụ: Ví MoMo, Vietcombank..." maxLength={100} />
                </Form.Item>

                <Form.Item
                    name="type"
                    label="Loại"
                    rules={[{ required: true, message: "Loại là bắt buộc" }]}
                    tooltip={isEdit ? "Không đổi được loại sau khi tạo" : undefined}
                >
                    <Select options={typeOptions} placeholder="Chọn loại" disabled={isEdit} />
                </Form.Item>

                {!isCreditCard ? (
                    <Form.Item
                        name="balance"
                        label="Số dư hiện có"
                        rules={[
                            { required: true, message: "Số dư là bắt buộc" },
                            numberMinRule(0, "Số dư phải >= 0"),
                        ]}
                    >
                        <DebouncedNumberInput
                            className="w-full!"
                            min={0}
                            step={1000}
                            placeholder="0"
                        />
                    </Form.Item>
                ) : (
                    <CreditCardFields
                        activeKeys={activeFeeSections}
                        onActiveKeysChange={setActiveFeeSections}
                    />
                )}

                {isBank ? (
                    <>
                        <div className="mb-2 text-sm font-medium">
                            Tài khoản nhận tiền{" "}
                            <span className="font-normal text-muted-foreground">
                                (tùy chọn, để tạo mã VietQR)
                            </span>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <Form.Item
                                name="bankBin"
                                label="Ngân hàng"
                                rules={[
                                    {
                                        required: Boolean(accountNumberWatch?.trim()),
                                        message: "Chọn ngân hàng của số tài khoản",
                                    },
                                ]}
                                help={
                                    isBanksError
                                        ? "Không tải được danh sách ngân hàng từ VietQR"
                                        : undefined
                                }
                            >
                                <Select
                                    showSearch
                                    optionFilterProp="searchText"
                                    allowClear
                                    loading={isBanksLoading}
                                    options={bankOptions}
                                    placeholder="Chọn ngân hàng"
                                />
                            </Form.Item>
                            <Form.Item
                                name="accountNumber"
                                label="Số tài khoản"
                                rules={[
                                    {
                                        required: Boolean(bankBinWatch),
                                        message: "Nhập số tài khoản",
                                    },
                                    {
                                        pattern: /^[0-9A-Za-z]{1,19}$/,
                                        message: "Chỉ gồm chữ/số, tối đa 19 ký tự",
                                    },
                                ]}
                            >
                                <Input placeholder="Ví dụ: 0123456789" maxLength={19} />
                            </Form.Item>
                        </div>
                        <Form.Item
                            name="accountName"
                            label="Tên chủ tài khoản"
                            extra="Lưu dạng in hoa, không dấu"
                            rules={[{ max: 50, message: "Tối đa 50 ký tự" }]}
                        >
                            <Input placeholder="NGUYEN VAN A" maxLength={50} />
                        </Form.Item>
                    </>
                ) : null}

                {amountChanged ? (
                    <Form.Item
                        name="adjustmentNote"
                        label="Lý do điều chỉnh"
                        extra="Lần điều chỉnh này được lưu vào lịch sử của nguồn tiền"
                        rules={[{ max: 200, message: "Tối đa 200 ký tự" }]}
                    >
                        <Input
                            placeholder="Ví dụ: Đối chiếu với app ngân hàng"
                            maxLength={200}
                        />
                    </Form.Item>
                ) : null}
            </Form>
        </ResponsiveModal>
    );
}
