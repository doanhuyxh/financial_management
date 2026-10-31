import type { Dayjs } from "dayjs";
import {
    ANNUAL_FEE_WAIVER_PERIOD_LABELS,
    AnnualFeeWaiverPeriod,
    type SourcesOfMoneyType,
} from "@/libs/interfaces/sourcesOfMoneyData";

type NumberValue = string | number | null;

/** Lãi và các phí theo % (kèm mức tối thiểu/tối đa) của thẻ. */
export const RATE_FEE_FIELDS = [
    { name: "interestRate", label: "Lãi suất (%/năm)", kind: "percent", tooltip: "Tính trên dư nợ khi không trả hết; rút tiền mặt bị tính lãi ngay từ ngày rút" },
    { name: "lateFeePercentPerDay", label: "Phí chậm trả (%/ngày)", kind: "percent", tooltip: "Tính trên số tiền thanh toán tối thiểu chưa trả" },
    { name: "lateFeeMin", label: "Phí chậm trả tối thiểu", kind: "money" },
    { name: "lateFeeMax", label: "Phí chậm trả tối đa", kind: "money" },
    { name: "cashAdvanceFeePercent", label: "Phí rút tiền mặt (%)", kind: "percent", tooltip: "Tự điền vào % phí khi chuyển tiền từ thẻ" },
    { name: "cashAdvanceFeeMin", label: "Tối thiểu", kind: "money", tooltip: "Áp dụng cho mọi lần chuyển tiền có phí từ thẻ" },
    { name: "foreignFxFeePercent", label: "Phí giao dịch ngoại tệ (%)", kind: "percent" },
    { name: "foreignFxFeeMin", label: "Tối thiểu", kind: "money" },
    { name: "foreignVndFeePercent", label: "Phí VND tại ĐV nước ngoài (%)", kind: "percent" },
    { name: "foreignVndFeeMin", label: "Tối thiểu", kind: "money" },
] as const;

export type RateFeeField = (typeof RATE_FEE_FIELDS)[number];
export type RateFeeFieldName = RateFeeField["name"];

export type FormValues = {
    name: string;
    type: SourcesOfMoneyType;
    balance?: NumberValue;
    creditLimit?: NumberValue;
    currentDebt?: NumberValue;
    statementDate?: NumberValue;
    dueDate?: NumberValue;
    annualFee?: NumberValue;
    annualFeeDate?: Dayjs | null;
    annualFeeWaiverPeriod?: AnnualFeeWaiverPeriod | null;
    annualFeeWaiverMinSpend?: NumberValue;
    managementFee?: NumberValue;
    managementFeeDay?: NumberValue;
    managementFeeWaiverMinTransactions?: NumberValue;
    managementFeeWaiverMinSpend?: NumberValue;
    paymentFee?: NumberValue;
    freePaymentsPerCycle?: NumberValue;
    adjustmentNote?: string;
    bankBin?: string;
    accountNumber?: string;
    accountName?: string;
} & Partial<Record<RateFeeFieldName, NumberValue>>;

/** Các mục phí thu gọn của thẻ; `fields` dùng để biết mục đã nhập hay có lỗi. */
export const CARD_FEE_SECTIONS = [
    {
        key: "annual",
        title: "Phí thường niên",
        fields: ["annualFee", "annualFeeDate", "annualFeeWaiverPeriod", "annualFeeWaiverMinSpend"],
    },
    {
        key: "management",
        title: "Phí quản lý",
        fields: [
            "managementFee",
            "managementFeeDay",
            "managementFeeWaiverMinTransactions",
            "managementFeeWaiverMinSpend",
        ],
    },
    { key: "payment", title: "Phí thanh toán dư nợ", fields: ["paymentFee", "freePaymentsPerCycle"] },
    {
        key: "interest",
        title: "Lãi & phí chậm trả",
        fields: ["interestRate", "lateFeePercentPerDay", "lateFeeMin", "lateFeeMax"],
    },
    {
        key: "transaction",
        title: "Rút tiền mặt & giao dịch quốc tế",
        fields: [
            "cashAdvanceFeePercent",
            "cashAdvanceFeeMin",
            "foreignFxFeePercent",
            "foreignFxFeeMin",
            "foreignVndFeePercent",
            "foreignVndFeeMin",
        ],
    },
] as const satisfies readonly { key: string; title: string; fields: readonly (keyof FormValues)[] }[];

export type CardFeeSectionKey = (typeof CARD_FEE_SECTIONS)[number]["key"];

/** Mục phí chứa các ô đang báo lỗi, để mở ra cho người dùng thấy. */
export function getSectionsWithErrors(errorFieldNames: (string | number)[]): CardFeeSectionKey[] {
    return CARD_FEE_SECTIONS.filter((section) =>
        (section.fields as readonly string[]).some((field) => errorFieldNames.includes(field)),
    ).map((section) => section.key);
}

export const waiverPeriodOptions = Object.values(AnnualFeeWaiverPeriod).map((period) => ({
    value: period,
    label: ANNUAL_FEE_WAIVER_PERIOD_LABELS[period],
}));

/** DebouncedNumberInput uses stringMode — coerce before validate/submit. */
export function toNumber(value: string | number | null | undefined): number | undefined {
    if (value === undefined || value === null || value === "") return undefined;
    const num = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
    return Number.isFinite(num) ? num : undefined;
}

export function numberMinRule(min: number, message: string) {
    return {
        validator(_: unknown, value: string | number | null | undefined) {
            if (value === undefined || value === null || value === "") {
                return Promise.resolve();
            }
            const num = toNumber(value);
            if (num === undefined || num < min) {
                return Promise.reject(new Error(message));
            }
            return Promise.resolve();
        },
    };
}

export function numberRangeRule(min: number, max: number, message: string) {
    return {
        validator(_: unknown, value: string | number | null | undefined) {
            if (value === undefined || value === null || value === "") {
                return Promise.resolve();
            }
            const num = toNumber(value);
            if (num === undefined || num < min || num > max) {
                return Promise.reject(new Error(message));
            }
            return Promise.resolve();
        },
    };
}
