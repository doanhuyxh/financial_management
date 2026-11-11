"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeftRight, ArrowRight, ChevronDown, RefreshCw } from "lucide-react";
import Money from "@/components/common/money";
import VisibilitySettings from "@/components/common/visibility-settings";
import { Button } from "@/components/shadcn/ui/button";
import { Progress } from "@/components/shadcn/ui/progress";
import { useDashboardContext } from "@/components/features/dashboard/context";
import ParagraphSkeleton from "@/components/common/paragraph-skeleton";
import type {
    CreditDueStatus,
    HeadlineTone,
    ICreditCardOverviewItem,
} from "@/components/features/dashboard/utils";
import FeeDetails, {
    FEE_SECTIONS,
} from "@/components/features/dashboard/components/credit-cards-panel/components/fee-details";
import useLocalStorage from "@/libs/hooks/useLocalStorage";
import { configLocalStorageKey } from "@/libs/constants/configKey";
import { MENU_KEY } from "@/libs/constants/menuKey";
import { cn } from "@/libs/shadcn/utils";
import { formatMoney } from "@/libs/utils/formatMoney";

const DUE_PILL_CLASS: Record<CreditDueStatus, string> = {
    today: "bg-debt-soft text-debt",
    urgent: "bg-debt-soft text-debt",
    soon: "bg-warn-soft text-warn",
    normal: "bg-muted text-muted-foreground",
    "no-due-date": "bg-muted text-muted-foreground",
};

const HEADLINE_CLASS: Record<HeadlineTone, string> = {
    warn: "text-warn",
    in: "text-money-in",
    neutral: "text-muted-foreground",
};

const ROW_GRID =
    "md:grid md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,1.7fr)_10rem] md:items-center md:gap-4";

function DueCell({ card }: { card: ICreditCardOverviewItem }) {
    if (card.currentDebt <= 0) return <span className="text-sm text-muted-foreground">—</span>;
    if (!card.nextDueDate) {
        return <span className="text-xs text-muted-foreground">Chưa đặt ngày đến hạn</span>;
    }
    return (
        <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm tabular-nums">{card.nextDueDate.format("DD/MM")}</span>
            <span
                className={cn(
                    "rounded-full px-2 py-px text-xs font-medium whitespace-nowrap",
                    DUE_PILL_CLASS[card.status],
                )}
            >
                {card.daysLeft === 0 ? "hôm nay" : `còn ${card.daysLeft} ngày`}
            </span>
        </div>
    );
}

function CardRow({
    card,
    expanded,
    onToggle,
    hiddenKeys,
}: {
    card: ICreditCardOverviewItem;
    expanded: boolean;
    onToggle: () => void;
    hiddenKeys: string[];
}) {
    const { handlePayCard, openRollover } = useDashboardContext();
    const usedPercent = card.creditLimit
        ? Math.round((card.currentDebt / card.creditLimit) * 100)
        : 0;
    const hasDebt = card.currentDebt > 0;

    return (
        <li className="border-t border-border py-3 first:border-t-0">
            <div className={cn("flex flex-col gap-2", ROW_GRID)}>
                {/* Tên + (mobile) tóm tắt */}
                <div className="flex min-w-0 items-start justify-between gap-2">
                    <div className="min-w-0">
                        <p className="truncate font-semibold">{card.name}</p>
                        <p className="text-xs text-muted-foreground md:hidden">
                            {hasDebt ? (
                                <>
                                    <Money value={card.currentDebt} kind="debt" />
                                    {card.nextDueDate
                                        ? ` · hạn ${card.nextDueDate.format("DD/MM")}${
                                              card.daysLeft != null && card.daysLeft <= 7
                                                  ? ` (còn ${card.daysLeft} ngày)`
                                                  : ""
                                          }`
                                        : ""}
                                </>
                            ) : (
                                "Không dư nợ"
                            )}
                        </p>
                    </div>
                </div>

                {/* Dư nợ / hạn mức */}
                <div className="hidden md:block">
                    <Money
                        value={card.currentDebt}
                        kind="debt"
                        mutedZero
                        className="text-sm font-semibold"
                    />
                    <Progress
                        value={usedPercent}
                        aria-label="Dư nợ / hạn mức"
                        className={cn(
                            "my-1.5 h-1.5",
                            usedPercent >= 90
                                ? "*:data-[slot=progress-indicator]:bg-debt"
                                : "*:data-[slot=progress-indicator]:bg-credit",
                        )}
                    />
                    <p className="money-value text-xs text-muted-foreground tabular-nums">
                        {usedPercent}% của {formatMoney(card.creditLimit)}
                    </p>
                </div>

                <div className="hidden md:block">
                    <DueCell card={card} />
                </div>

                <p className={cn("text-xs md:text-sm", HEADLINE_CLASS[card.headline.tone])}>
                    {card.headline.text}
                </p>

                <div className="flex items-center gap-2 md:justify-end">
                    {hasDebt ? (
                        <>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handlePayCard(card._id, card.currentDebt)}
                            >
                                <ArrowLeftRight data-icon="inline-start" />
                                Trả nợ
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                title="Ghi lần dùng dịch vụ đáo hạn thẻ"
                                onClick={() => openRollover(card._id)}
                            >
                                <RefreshCw data-icon="inline-start" />
                                Đáo hạn
                            </Button>
                        </>
                    ) : null}
                    {card.fee ? (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-expanded={expanded}
                            aria-label={expanded ? "Ẩn chi tiết phí" : "Xem chi tiết phí"}
                            onClick={onToggle}
                            // Desktop chỉ còn icon → nút vuông; mobile có chữ "Chi tiết phí"
                            className="md:w-7 md:px-0"
                        >
                            <ChevronDown
                                className={cn("size-4 transition-transform", expanded && "rotate-180")}
                            />
                            <span className="md:hidden">Chi tiết phí</span>
                        </Button>
                    ) : null}
                </div>
            </div>
            {expanded && card.fee ? (
                <div className="mt-3">
                    <FeeDetails item={card.fee} hiddenKeys={hiddenKeys} />
                </div>
            ) : null}
        </li>
    );
}

/** Mọi thẻ tín dụng trong một danh sách: dư nợ, hạn trả, phí sắp tới; bấm mở rộng để xem chi tiết phí. */
export default function CreditCardsPanel() {
    const { creditCards, isSourcesLoading } = useDashboardContext();
    const [expandedIds, setExpandedIds] = useState<string[]>([]);
    const [hiddenKeys, setHiddenKeys] = useLocalStorage<string[]>(
        configLocalStorageKey.DASHBOARD_CARD_FEE_HIDDEN_COLUMNS,
        [],
    );

    if (!isSourcesLoading && creditCards.length === 0) return null;

    const toggle = (id: string) =>
        setExpandedIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
        );

    return (
        <section className="rounded-xl border border-border bg-card p-4">
            <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="text-base font-semibold">Thẻ tín dụng</h2>
                    <p className="text-xs text-muted-foreground">
                        Dư nợ, hạn trả và phí sắp tới · thẻ còn nợ lên trước
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <VisibilitySettings
                        options={FEE_SECTIONS}
                        hiddenKeys={hiddenKeys}
                        onChange={setHiddenKeys}
                        buttonLabel="Mục phí"
                        title="Chọn mục phí hiển thị khi mở rộng"
                    />
                    <Button variant="outline" size="sm" asChild>
                        <Link href={MENU_KEY.CREDIT_CARD_COMPARE}>
                            So sánh thẻ
                            <ArrowRight data-icon="inline-end" />
                        </Link>
                    </Button>
                </div>
            </div>

            <div
                className={cn(
                    "hidden border-b border-border pb-2 text-xs text-muted-foreground",
                    ROW_GRID,
                )}
            >
                <span>Thẻ</span>
                <span>Dư nợ / hạn mức</span>
                <span>Hạn trả</span>
                <span>Phí sắp tới</span>
                <span />
            </div>

            {isSourcesLoading ? (
                <ParagraphSkeleton rows={3} />
            ) : (
                <ul>
                    {creditCards.map((card) => (
                        <CardRow
                            key={card._id}
                            card={card}
                            expanded={expandedIds.includes(card._id)}
                            onToggle={() => toggle(card._id)}
                            hiddenKeys={hiddenKeys}
                        />
                    ))}
                </ul>
            )}
        </section>
    );
}
