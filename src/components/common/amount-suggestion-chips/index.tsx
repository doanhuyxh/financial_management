"use client";

import { Tag } from "antd";

const amountFormatter = new Intl.NumberFormat("vi-VN");

type AmountSuggestionChipsProps = {
    amounts: number[] | undefined;
    value?: string | number | null;
    onSelect: (amount: number) => void;
};

export default function AmountSuggestionChips({
    amounts,
    value,
    onSelect,
}: AmountSuggestionChipsProps) {
    if (!amounts?.length) return null;

    const current = Number(value);

    return (
        <div className="mt-1.5 flex flex-wrap items-center gap-y-1.5">
            <span className="mr-1.5 shrink-0 text-xs text-muted-foreground">Gợi ý:</span>
            {amounts.map((amount) => (
                <Tag.CheckableTag
                    key={amount}
                    checked={current === amount}
                    onChange={() => onSelect(amount)}
                >
                    {amountFormatter.format(amount)}
                </Tag.CheckableTag>
            ))}
        </div>
    );
}
