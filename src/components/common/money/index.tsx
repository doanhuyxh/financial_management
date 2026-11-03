import { cn } from "@/libs/shadcn/utils";
import { formatMoney } from "@/libs/utils/formatMoney";

/**
 * Màu theo nghĩa của số tiền:
 * - in: tiền vào (thu nhập) · out: tiền ra (chi tiêu, phí) · debt: dư nợ, số âm cần chú ý
 * - credit: hạn mức tín dụng · neutral: không tô màu
 * - auto: âm → debt, còn lại → neutral
 */
export type MoneyKind = "in" | "out" | "debt" | "credit" | "neutral" | "auto";

const KIND_CLASS: Record<Exclude<MoneyKind, "auto">, string> = {
    in: "text-money-in",
    out: "text-money-out",
    debt: "text-debt",
    credit: "text-credit",
    neutral: "",
};

interface IMoneyProps {
    value: number | null | undefined;
    kind?: MoneyKind;
    /** Hiện dấu "+" / "−" trước số (dấu trừ U+2212). */
    signed?: boolean;
    /** Giá trị 0 hiện màu muted thay vì màu của `kind`. */
    mutedZero?: boolean;
    className?: string;
}

export default function Money({
    value,
    kind = "neutral",
    signed = false,
    mutedZero = false,
    className,
}: IMoneyProps) {
    const resolvedKind: Exclude<MoneyKind, "auto"> =
        kind === "auto" ? ((value ?? 0) < 0 ? "debt" : "neutral") : kind;
    const isZero = !value;

    let text = formatMoney(value);
    if (signed && value) {
        text = `${value > 0 ? "+" : "−"}${formatMoney(Math.abs(value))}`;
    }

    return (
        <span
            className={cn(
                "tabular-nums whitespace-nowrap",
                mutedZero && isZero ? "text-muted-foreground" : KIND_CLASS[resolvedKind],
                className,
            )}
        >
            {text}
        </span>
    );
}
