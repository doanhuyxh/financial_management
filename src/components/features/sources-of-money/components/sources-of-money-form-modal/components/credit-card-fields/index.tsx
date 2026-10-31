"use client";

import type { ReactNode } from "react";
import { Collapse, DatePicker, Form, Select, Tag } from "antd";
import DebouncedNumberInput from "@/components/common/input/DebouncedNumberInput";
import {
    CARD_FEE_SECTIONS,
    numberMinRule,
    numberRangeRule,
    RATE_FEE_FIELDS,
    toNumber,
    waiverPeriodOptions,
    type CardFeeSectionKey,
    type FormValues,
    type RateFeeFieldName,
} from "@/components/features/sources-of-money/components/sources-of-money-form-modal/utils";

function Grid({ children }: { children: ReactNode }) {
    return <div className="grid grid-cols-1 gap-x-3 sm:grid-cols-2">{children}</div>;
}

function SectionNote({ children }: { children: ReactNode }) {
    return <p className="mb-3 text-xs text-muted-foreground">{children}</p>;
}

function RateFeeItems({ names }: { names: RateFeeFieldName[] }) {
    return RATE_FEE_FIELDS.filter((field) => names.includes(field.name)).map((field) => (
        <Form.Item
            key={field.name}
            name={field.name}
            label={field.label}
            tooltip={"tooltip" in field ? field.tooltip : undefined}
            rules={[
                field.kind === "percent"
                    ? numberRangeRule(0, 100, "Từ 0 đến 100")
                    : numberMinRule(0, "Phải >= 0"),
            ]}
        >
            <DebouncedNumberInput
                className="w-full!"
                min={0}
                max={field.kind === "percent" ? 100 : undefined}
                step={field.kind === "percent" ? 0.01 : 1000}
                placeholder="0"
            />
        </Form.Item>
    ));
}

/**
 * Các ô của thẻ tín dụng: thông tin thẻ luôn hiện, phí gom vào từng mục thu gọn.
 * Mục được render sẵn (forceRender) để giá trị và validate vẫn chạy khi đang đóng.
 */
export default function CreditCardFields({
    activeKeys,
    onActiveKeysChange,
}: {
    activeKeys: CardFeeSectionKey[];
    onActiveKeysChange: (keys: CardFeeSectionKey[]) => void;
}) {
    const form = Form.useFormInstance<FormValues>();
    const values = Form.useWatch((all: FormValues) => all, form);
    const waiverPeriodWatch = values?.annualFeeWaiverPeriod;
    const paymentFeeWatch = values?.paymentFee;

    const isFilled = (field: keyof FormValues) => {
        const value = values?.[field];
        return value !== undefined && value !== null && value !== "";
    };

    const sectionBodies: Record<CardFeeSectionKey, ReactNode> = {
        annual: (
            <Grid>
                <Form.Item
                    name="annualFee"
                    label="Phí (ước tính)"
                    tooltip="Số thực tế có thể khác; khi bị thu, ghi một khoản chi tiêu trên thẻ"
                    rules={[numberMinRule(0, "Phí phải >= 0")]}
                >
                    <DebouncedNumberInput className="w-full!" min={0} step={1000} placeholder="0" />
                </Form.Item>
                <Form.Item
                    name="annualFeeDate"
                    label="Ngày thu"
                    tooltip="Lặp lại mỗi năm vào ngày/tháng này"
                >
                    <DatePicker className="w-full" format="DD/MM" placeholder="Chọn ngày/tháng" />
                </Form.Item>
                <Form.Item
                    name="annualFeeWaiverPeriod"
                    label="Miễn phí khi chi tiêu"
                    tooltip="Theo năm: tổng chi tiêu trong 12 tháng trước ngày thu phí. Theo kỳ sao kê: chi tiêu mỗi kỳ (tháng dương lịch nếu chưa nhập ngày sao kê). Không tính các khoản phí thẻ và phí chuyển tiền"
                >
                    <Select allowClear options={waiverPeriodOptions} placeholder="Không áp dụng" />
                </Form.Item>
                <Form.Item
                    name="annualFeeWaiverMinSpend"
                    label="Chi tiêu tối thiểu"
                    rules={[
                        {
                            required: Boolean(waiverPeriodWatch),
                            message: "Nhập mức chi tiêu tối thiểu",
                        },
                        numberMinRule(1, "Phải > 0"),
                    ]}
                >
                    <DebouncedNumberInput
                        className="w-full!"
                        min={0}
                        step={1000}
                        placeholder="0"
                        disabled={!waiverPeriodWatch}
                    />
                </Form.Item>
            </Grid>
        ),
        management: (
            <>
                <Grid>
                    <Form.Item
                        name="managementFee"
                        label="Phí (ước tính/tháng)"
                        tooltip="Số thực tế có thể khác; khi bị thu, ghi một khoản chi tiêu trên thẻ"
                        rules={[numberMinRule(0, "Phí phải >= 0")]}
                    >
                        <DebouncedNumberInput className="w-full!" min={0} step={1000} placeholder="0" />
                    </Form.Item>
                    <Form.Item
                        name="managementFeeDay"
                        label="Ngày thu"
                        rules={[numberRangeRule(1, 31, "Từ 1 đến 31")]}
                    >
                        <DebouncedNumberInput className="w-full!" min={1} max={31} placeholder="1-31" />
                    </Form.Item>
                </Grid>
                <SectionNote>
                    Miễn phí khi đạt <b>một trong hai</b> điều kiện trong kỳ sao kê (không tính phí
                    thẻ và phí chuyển tiền):
                </SectionNote>
                <Grid>
                    <Form.Item
                        name="managementFeeWaiverMinTransactions"
                        label="Số giao dịch tối thiểu"
                        rules={[numberRangeRule(1, 1000, "Từ 1 đến 1000")]}
                    >
                        <DebouncedNumberInput
                            className="w-full!"
                            min={1}
                            step={1}
                            placeholder="Số giao dịch/kỳ"
                        />
                    </Form.Item>
                    <Form.Item
                        name="managementFeeWaiverMinSpend"
                        label="Hoặc chi tiêu tối thiểu"
                        rules={[numberMinRule(1, "Phải > 0")]}
                    >
                        <DebouncedNumberInput
                            className="w-full!"
                            min={0}
                            step={100000}
                            placeholder="Chi tiêu/kỳ"
                        />
                    </Form.Item>
                </Grid>
            </>
        ),
        payment: (
            <>
                <SectionNote>
                    Thu mỗi lần trả nợ thẻ (chuyển tiền hoặc thu nhập vào thẻ) vượt số lần miễn phí
                    trong kỳ sao kê.
                </SectionNote>
                <Grid>
                    <Form.Item
                        name="paymentFee"
                        label="Phí mỗi lần"
                        rules={[numberMinRule(0, "Phí phải >= 0")]}
                    >
                        <DebouncedNumberInput className="w-full!" min={0} step={1000} placeholder="0" />
                    </Form.Item>
                    <Form.Item
                        name="freePaymentsPerCycle"
                        label="Số lần miễn phí/kỳ"
                        rules={[numberRangeRule(0, 100, "Từ 0 đến 100")]}
                    >
                        <DebouncedNumberInput
                            className="w-full!"
                            min={0}
                            step={1}
                            placeholder="0"
                            disabled={toNumber(paymentFeeWatch) == null}
                        />
                    </Form.Item>
                </Grid>
            </>
        ),
        usage: (
            <>
                <SectionNote>
                    Một số thẻ (VD: MoMo) không có phí thường niên/quản lý nhưng thu một khoản cố
                    định trong kỳ sao kê nào có ít nhất một giao dịch chi tiêu.
                </SectionNote>
                <Grid>
                    <RateFeeItems names={["usageFee"]} />
                </Grid>
            </>
        ),
        interest: (
            <Grid>
                <RateFeeItems
                    names={["interestRate", "lateFeePercentPerDay", "lateFeeMin", "lateFeeMax"]}
                />
            </Grid>
        ),
        transaction: (
            <Grid>
                <RateFeeItems
                    names={[
                        "cashAdvanceFeePercent",
                        "cashAdvanceFeeMin",
                        "foreignFxFeePercent",
                        "foreignFxFeeMin",
                        "foreignVndFeePercent",
                        "foreignVndFeeMin",
                    ]}
                />
            </Grid>
        ),
    };

    return (
        <>
            <div className="mb-2 text-sm font-medium">Thông tin thẻ</div>
            <Grid>
                <Form.Item
                    name="creditLimit"
                    label="Hạn mức tín dụng"
                    rules={[
                        { required: true, message: "Hạn mức là bắt buộc" },
                        numberMinRule(0, "Hạn mức phải >= 0"),
                    ]}
                >
                    <DebouncedNumberInput className="w-full!" min={0} step={1000} />
                </Form.Item>
                <Form.Item
                    name="currentDebt"
                    label="Dư nợ hiện tại"
                    rules={[
                        { required: true, message: "Dư nợ là bắt buộc" },
                        numberMinRule(0, "Dư nợ phải >= 0"),
                    ]}
                >
                    <DebouncedNumberInput className="w-full!" min={0} step={1000} />
                </Form.Item>
                <Form.Item
                    name="statementDate"
                    label="Ngày sao kê"
                    tooltip="Xác định kỳ sao kê để tính điều kiện miễn phí và số lần trả nợ"
                    rules={[numberRangeRule(1, 31, "Từ 1 đến 31")]}
                >
                    <DebouncedNumberInput className="w-full!" min={1} max={31} placeholder="1-31" />
                </Form.Item>
                <Form.Item
                    name="dueDate"
                    label="Ngày đến hạn"
                    rules={[numberRangeRule(1, 31, "Từ 1 đến 31")]}
                >
                    <DebouncedNumberInput className="w-full!" min={1} max={31} placeholder="1-31" />
                </Form.Item>
            </Grid>

            <div className="mb-2 text-sm font-medium">
                Phí & lãi{" "}
                <span className="font-normal text-muted-foreground">
                    (tùy chọn, là số ước tính)
                </span>
            </div>
            <Collapse
                className="mb-4"
                activeKey={activeKeys}
                onChange={(keys) => onActiveKeysChange(keys as CardFeeSectionKey[])}
                items={CARD_FEE_SECTIONS.map((section) => {
                    const filled = section.fields.filter((field) => isFilled(field)).length;
                    return {
                        key: section.key,
                        label: section.title,
                        forceRender: true,
                        extra:
                            filled > 0 ? (
                                <Tag color="green" className="m-0">
                                    Đã nhập {filled}
                                </Tag>
                            ) : (
                                <span className="text-xs text-muted-foreground">Chưa nhập</span>
                            ),
                        children: sectionBodies[section.key],
                    };
                })}
            />
        </>
    );
}
