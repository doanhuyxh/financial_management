"use client";

import { Tag } from "antd";
import { Sparkles } from "lucide-react";

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
            <Sparkles className="mr-1.5 size-3.5 shrink-0 text-neutral-400" aria-hidden />
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
