"use client";

import Link from "next/link";
import { ArrowLeftRight, ChartLine, RefreshCw } from "lucide-react";
import { Button } from "@/components/shadcn/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/shadcn/ui/tooltip";
import { MENU_KEY } from "@/libs/constants/menuKey";
import { ACCENT_BUTTON_CLASS } from "@/libs/constants/buttonStyles";
import { useDashboardContext } from "@/components/features/dashboard/context";
import type { IAttentionItem } from "@/components/features/dashboard/utils";
import { cn } from "@/libs/shadcn/utils";

const DOT_CLASS: Record<IAttentionItem["tone"], string> = {
    debt: "bg-debt",
    warn: "bg-warn",
};

/**
 * Hàng "Cần chú ý" đầu dashboard, dạng chip gọn một hàng: hạn trả thẻ, phí sắp tính, tài sản ròng âm.
 * Mô tả chi tiết nằm trong tooltip của chip. Không có gì thì ẩn.
 */
export default function AttentionStrip() {
    const { attentionItems, handlePayCard, openRollover } = useDashboardContext();

    if (attentionItems.length === 0) return null;

    return (
        <section
            aria-label="Cần chú ý"
            className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3 md:mx-0 md:flex-wrap md:overflow-visible md:px-0"
        >
            {attentionItems.map((item) => {
                const hasAction = Boolean(item.payCard || item.rolloverCard || item.journeyCard);
                return (
                    <div
                        key={item.key}
                        className={cn(
                            "flex shrink-0 items-center gap-2 rounded-full border border-border bg-card py-1 pl-3 text-xs",
                            hasAction ? "pr-1" : "pr-3",
                        )}
                    >
                        <span aria-hidden className={cn("size-2 shrink-0 rounded-full", DOT_CLASS[item.tone])} />
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span className="font-medium whitespace-nowrap">{item.title}</span>
                            </TooltipTrigger>
                            <TooltipContent className="money-value">{item.description}</TooltipContent>
                        </Tooltip>
                        {item.payCard ? (
                            <Button
                                type="button"
                                size="xs"
                                className="rounded-full"
                                onClick={() => handlePayCard(item.payCard!._id, item.payCard!.amount)}
                            >
                                <ArrowLeftRight data-icon="inline-start" />
                                Thanh toán
                            </Button>
                        ) : null}
                        {item.rolloverCard ? (
                            <Button
                                type="button"
                                variant="outline"
                                size="xs"
                                className={cn("rounded-full", ACCENT_BUTTON_CLASS)}
                                onClick={() => openRollover(item.rolloverCard!._id)}
                            >
                                <RefreshCw data-icon="inline-start" />
                                Đáo hạn
                            </Button>
                        ) : null}
                        {item.journeyCard ? (
                            <Button
                                variant="outline"
                                size="xs"
                                className={cn("rounded-full", ACCENT_BUTTON_CLASS)}
                                asChild
                            >
                                <Link href={`${MENU_KEY.ROLLOVER_JOURNEY}?cardId=${item.journeyCard._id}`}>
                                    <ChartLine data-icon="inline-start" />
                                    Phân tích
                                </Link>
                            </Button>
                        ) : null}
                    </div>
                );
            })}
        </section>
    );
}
