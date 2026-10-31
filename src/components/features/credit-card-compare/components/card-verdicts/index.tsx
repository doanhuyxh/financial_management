"use client";

import { CircleAlert, ThumbsDown, ThumbsUp } from "lucide-react";
import { useCreditCardCompareContext } from "@/components/features/credit-card-compare/context";

function VerdictList({
    items,
    icon,
    className,
}: {
    items: string[];
    icon: React.ReactNode;
    className: string;
}) {
    return items.map((item) => (
        <li key={item} className={`flex items-start gap-2 ${className}`}>
            <span className="mt-0.5 shrink-0">{icon}</span>
            {item}
        </li>
    ));
}

/** Điểm mạnh/yếu của từng thẻ so với các thẻ còn lại. */
export default function CardVerdicts() {
    const { cards, verdicts } = useCreditCardCompareContext();

    return (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {cards.map((card) => {
                const verdict = verdicts.get(card._id);
                const isEmpty =
                    !verdict?.strengths.length && !verdict?.weaknesses.length;
                return (
                    <div
                        key={card._id}
                        className="flex flex-col gap-2 rounded-xl border border-border bg-background p-4"
                    >
                        <span className="font-semibold">{card.name}</span>
                        <ul className="flex flex-col gap-1 text-sm">
                            <VerdictList
                                items={verdict?.strengths ?? []}
                                icon={<ThumbsUp className="size-4" />}
                                className="text-green-600 dark:text-green-400"
                            />
                            <VerdictList
                                items={verdict?.weaknesses ?? []}
                                icon={<ThumbsDown className="size-4" />}
                                className="text-red-600 dark:text-red-400"
                            />
                            {isEmpty ? (
                                <li className="text-muted-foreground">
                                    Không nổi bật hay kém hơn thẻ nào
                                </li>
                            ) : null}
                        </ul>
                        {card.missing.length > 0 ? (
                            <p className="flex items-start gap-2 text-xs text-muted-foreground">
                                <CircleAlert className="mt-0.5 size-3.5 shrink-0" />
                                Chưa nhập {card.missing.join(", ")} — kết quả có thể chưa đủ
                            </p>
                        ) : null}
                    </div>
                );
            })}
        </div>
    );
}
