"use client";

import { KEEP_AMOUNT_KEYPAD_ATTR } from "@/components/common/amount-input";
import { cn } from "@/libs/shadcn/utils";

const amountFormatter = new Intl.NumberFormat("vi-VN");

type AmountSuggestionChipsProps = {
    amounts: number[] | undefined;
    value?: string | number | null;
    onSelect: (amount: number) => void;
};

/** Hàng chip gợi ý số tiền dưới ô nhập; chip đang trùng giá trị ô nhập được tô chọn. */
export default function AmountSuggestionChips({
    amounts,
    value,
    onSelect,
}: AmountSuggestionChipsProps) {
    if (!amounts?.length) return null;

    const current = Number(value);

    return (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5" {...{ [KEEP_AMOUNT_KEYPAD_ATTR]: "" }}>
            <span className="mr-0.5 shrink-0 text-xs text-muted-foreground">Gợi ý:</span>
            {amounts.map((amount) => {
                const selected = current === amount;
                return (
                    <button
                        key={amount}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => onSelect(amount)}
                        className={cn(
                            "inline-flex shrink-0 cursor-pointer items-center rounded-full border px-2.5 py-0.5 text-[13px] leading-5 tabular-nums transition-colors",
                            selected
                                ? "border-primary bg-primary-soft font-medium text-accent-text"
                                : "border-border bg-card text-foreground hover:border-primary/60",
                        )}
                    >
                        {amountFormatter.format(amount)}
                    </button>
                );
            })}
        </div>
    );
}
