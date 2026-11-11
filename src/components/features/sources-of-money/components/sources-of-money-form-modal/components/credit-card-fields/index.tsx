"use client";

import type { ReactNode } from "react";
import { Controller, useFormContext, useWatch, type ControllerProps } from "react-hook-form";
import { ChevronDown } from "lucide-react";
import Combobox from "@/components/common/combobox";
import DatePicker from "@/components/common/date-picker";
import FormField from "@/components/common/form-field";
import DebouncedNumberInput from "@/components/common/input/DebouncedNumberInput";
import Tag from "@/components/common/tag";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/shadcn/ui/collapsible";
import {
    CARD_FEE_SECTIONS,
    isBlankValue,
    numberMinRule,
    numberRangeRule,
    RATE_FEE_FIELDS,
    toNumber,
    waiverPeriodOptions,
    type CardFeeSectionKey,
    type FormValues,
    type NumberFieldName,
    type RateFeeFieldName,
} from "@/components/features/sources-of-money/components/sources-of-money-form-modal/utils";
import { cn } from "@/libs/shadcn/utils";

function Grid({ children }: { children: ReactNode }) {
    return <div className="grid grid-cols-1 gap-x-3 gap-y-4 sm:grid-cols-2">{children}</div>;
}

function SectionNote({ children }: { children: ReactNode }) {
    return <p className="text-xs text-muted-foreground">{children}</p>;
}

interface INumberFieldProps {
    name: NumberFieldName;
    label: string;
    tooltip?: string;
    rules?: ControllerProps<FormValues, NumberFieldName>["rules"];
    /** Số chữ số thập phân; mặc định 0 (số tiền, ngày, số lần) */
    precision?: number;
    placeholder?: string;
    disabled?: boolean;
}

/** Một ô số của form thẻ: nhãn + tooltip + DebouncedNumberInput nối với react-hook-form. */
function NumberField({ name, label, tooltip, rules, precision = 0, placeholder, disabled }: INumberFieldProps) {
    const { control } = useFormContext<FormValues>();
    return (
        <Controller
            name={name}
            control={control}
            rules={rules}
            render={({ field, fieldState }) => (
                <FormField label={label} tooltip={tooltip} error={fieldState.error?.message}>
                    <DebouncedNumberInput
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        min={0}
                        precision={precision}
                        placeholder={placeholder}
                        disabled={disabled}
                    />
                </FormField>
            )}
        />
    );
}

function RateFeeItems({ names }: { names: RateFeeFieldName[] }) {
    return RATE_FEE_FIELDS.filter((field) => names.includes(field.name)).map((field) => (
        <NumberField
            key={field.name}
            name={field.name}
            label={field.label}
            tooltip={"tooltip" in field ? field.tooltip : undefined}
            precision={field.kind === "percent" ? 2 : 0}
            placeholder="0"
            rules={{
                validate:
                    field.kind === "percent"
                        ? numberRangeRule(0, 100, "Từ 0 đến 100")
                        : numberMinRule(0, "Phải >= 0"),
            }}
        />
    ));
}

/**
 * Các ô của thẻ tín dụng: thông tin thẻ luôn hiện, phí gom vào từng mục thu gọn.
 * Nội dung mục luôn được mount (`forceMount`) để giá trị và validate vẫn chạy khi đang đóng.
 */
export default function CreditCardFields({
    activeKeys,
    onActiveKeysChange,
}: {
    activeKeys: CardFeeSectionKey[];
    onActiveKeysChange: (keys: CardFeeSectionKey[]) => void;
}) {
    const { control } = useFormContext<FormValues>();
    const values = useWatch({ control });
    const waiverPeriodWatch = values.annualFeeWaiverPeriod;
    const paymentFeeWatch = values.paymentFee;

    const isFilled = (field: keyof FormValues) => {
        const value = values[field];
        return value !== undefined && value !== null && value !== "";
    };

    const toggleSection = (key: CardFeeSectionKey, open: boolean) => {
        onActiveKeysChange(
            open ? Array.from(new Set([...activeKeys, key])) : activeKeys.filter((item) => item !== key),
        );
    };

    const sectionBodies: Record<CardFeeSectionKey, ReactNode> = {
        annual: (
            <Grid>
                <NumberField
                    name="annualFee"
                    label="Phí (ước tính)"
                    tooltip="Số thực tế có thể khác; khi bị thu, ghi một khoản chi tiêu trên thẻ"
                    placeholder="0"
                    rules={{ validate: numberMinRule(0, "Phí phải >= 0") }}
                />
                <Controller
                    name="annualFeeDate"
                    control={control}
                    render={({ field }) => (
                        <FormField label="Ngày thu" tooltip="Lặp lại mỗi năm vào ngày/tháng này">
                            <DatePicker
                                value={field.value ?? null}
                                onChange={field.onChange}
                                format="DD/MM"
                                placeholder="Chọn ngày/tháng"
                            />
                        </FormField>
                    )}
                />
                <Controller
                    name="annualFeeWaiverPeriod"
                    control={control}
                    render={({ field }) => (
                        <FormField
                            label="Miễn phí khi chi tiêu"
                            tooltip="Theo năm: tổng chi tiêu trong 12 tháng trước ngày thu phí. Theo kỳ sao kê: chi tiêu mỗi kỳ (tháng dương lịch nếu chưa nhập ngày sao kê). Không tính các khoản phí thẻ và phí chuyển tiền"
                        >
                            <Combobox
                                allowClear
                                options={waiverPeriodOptions}
                                placeholder="Không áp dụng"
                                value={field.value ?? null}
                                onChange={(value) => field.onChange(value ?? null)}
                            />
                        </FormField>
                    )}
                />
                <NumberField
                    name="annualFeeWaiverMinSpend"
                    label="Chi tiêu tối thiểu"
                    placeholder="0"
                    disabled={!waiverPeriodWatch}
                    rules={{
                        validate: {
                            required: (value, formValues) =>
                                !formValues.annualFeeWaiverPeriod ||
                                !isBlankValue(value) ||
                                "Nhập mức chi tiêu tối thiểu",
                            min: numberMinRule(1, "Phải > 0"),
                        },
                    }}
                />
            </Grid>
        ),
        management: (
            <>
                <Grid>
                    <NumberField
                        name="managementFee"
                        label="Phí (ước tính/tháng)"
                        tooltip="Số thực tế có thể khác; khi bị thu, ghi một khoản chi tiêu trên thẻ"
                        placeholder="0"
                        rules={{ validate: numberMinRule(0, "Phí phải >= 0") }}
                    />
                    <NumberField
                        name="managementFeeDay"
                        label="Ngày thu"
                        placeholder="1-31"
                        rules={{ validate: numberRangeRule(1, 31, "Từ 1 đến 31") }}
                    />
                </Grid>
                <SectionNote>
                    Miễn phí khi đạt <b>một trong hai</b> điều kiện trong kỳ sao kê (không tính phí
                    thẻ và phí chuyển tiền):
                </SectionNote>
                <Grid>
                    <NumberField
                        name="managementFeeWaiverMinTransactions"
                        label="Số giao dịch tối thiểu"
                        placeholder="Số giao dịch/kỳ"
                        rules={{ validate: numberRangeRule(1, 1000, "Từ 1 đến 1000") }}
                    />
                    <NumberField
                        name="managementFeeWaiverMinSpend"
                        label="Hoặc chi tiêu tối thiểu"
                        placeholder="Chi tiêu/kỳ"
                        rules={{ validate: numberMinRule(1, "Phải > 0") }}
                    />
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
                    <NumberField
                        name="paymentFee"
                        label="Phí mỗi lần"
                        placeholder="0"
                        rules={{ validate: numberMinRule(0, "Phí phải >= 0") }}
                    />
                    <NumberField
                        name="freePaymentsPerCycle"
                        label="Số lần miễn phí/kỳ"
                        placeholder="0"
                        disabled={toNumber(paymentFeeWatch) == null}
                        rules={{ validate: numberRangeRule(0, 100, "Từ 0 đến 100") }}
                    />
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
        rollover: (
            <>
                <SectionNote>
                    Dịch vụ đáo hạn ứng tiền trả sao kê rồi quẹt lại thẻ. Dư nợ không giảm, mỗi lần
                    mất phí; ngân hàng có thể khóa thẻ nếu phát hiện. Nhập % để app ước tính chi phí và
                    so với lãi.
                </SectionNote>
                <Grid>
                    <RateFeeItems names={["rolloverFeePercent"]} />
                </Grid>
            </>
        ),
    };

    return (
        <>
            <div className="flex flex-col gap-2">
                <div className="text-sm font-medium">Thông tin thẻ</div>
                <Grid>
                    <NumberField
                        name="creditLimit"
                        label="Hạn mức tín dụng"
                        rules={{
                            required: "Hạn mức là bắt buộc",
                            validate: numberMinRule(0, "Hạn mức phải >= 0"),
                        }}
                    />
                    <NumberField
                        name="currentDebt"
                        label="Dư nợ hiện tại"
                        rules={{
                            required: "Dư nợ là bắt buộc",
                            validate: numberMinRule(0, "Dư nợ phải >= 0"),
                        }}
                    />
                    <NumberField
                        name="statementDate"
                        label="Ngày sao kê"
                        tooltip="Xác định kỳ sao kê để tính điều kiện miễn phí và số lần trả nợ"
                        placeholder="1-31"
                        rules={{ validate: numberRangeRule(1, 31, "Từ 1 đến 31") }}
                    />
                    <NumberField
                        name="dueDate"
                        label="Ngày đến hạn"
                        placeholder="1-31"
                        rules={{ validate: numberRangeRule(1, 31, "Từ 1 đến 31") }}
                    />
                </Grid>
            </div>

            <div className="flex flex-col gap-2">
                <div className="text-sm font-medium">
                    Phí & lãi{" "}
                    <span className="font-normal text-muted-foreground">
                        (tùy chọn, là số ước tính)
                    </span>
                </div>
                <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                    {CARD_FEE_SECTIONS.map((section) => {
                        const open = activeKeys.includes(section.key);
                        const filled = section.fields.filter((field) => isFilled(field)).length;
                        return (
                            <Collapsible
                                key={section.key}
                                open={open}
                                onOpenChange={(next) => toggleSection(section.key, next)}
                            >
                                <CollapsibleTrigger className="flex w-full cursor-pointer items-center gap-2 bg-muted/40 px-3 py-2.5 text-left text-sm font-medium transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50">
                                    <ChevronDown
                                        className={cn(
                                            "size-4 shrink-0 text-muted-foreground transition-transform",
                                            open && "rotate-180",
                                        )}
                                    />
                                    <span className="flex-1">{section.title}</span>
                                    {filled > 0 ? (
                                        <Tag color="green">Đã nhập {filled}</Tag>
                                    ) : (
                                        <span className="text-xs font-normal text-muted-foreground">
                                            Chưa nhập
                                        </span>
                                    )}
                                </CollapsibleTrigger>
                                {/* forceMount: ô trong mục đang đóng vẫn đăng ký với form để validate */}
                                <CollapsibleContent forceMount>
                                    <div className="flex flex-col gap-4 px-3 pt-3 pb-4">
                                        {sectionBodies[section.key]}
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>
                        );
                    })}
                </div>
            </div>
        </>
    );
}
