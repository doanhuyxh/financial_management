"use client";

import { Button } from "antd";
import Link from "next/link";
import { ArrowLeftRight, CalendarClock, ChartLine, CircleAlert, CreditCard, RefreshCw } from "lucide-react";
import { MENU_KEY } from "@/libs/constants/menuKey";
import { useDashboardContext } from "@/components/features/dashboard/context";
import type { IAttentionItem } from "@/components/features/dashboard/utils";
import { cn } from "@/libs/shadcn/utils";

const ICONS: Record<IAttentionItem["icon"], React.ReactNode> = {
    due: <CalendarClock className="size-4" />,
    fee: <CreditCard className="size-4" />,
    "net-worth": <CircleAlert className="size-4" />,
    rollover: <RefreshCw className="size-4" />,
};

const TONE_CLASS: Record<IAttentionItem["tone"], string> = {
    debt: "bg-debt-soft text-debt",
    warn: "bg-warn-soft text-warn",
};

/** Hàng "Cần chú ý" đầu dashboard: hạn trả thẻ, phí sắp tính, tài sản ròng âm. Không có gì thì ẩn. */
export default function AttentionStrip() {
    const { attentionItems, handlePayCard, openRollover } = useDashboardContext();

    if (attentionItems.length === 0) return null;

    return (
        <section
            aria-label="Cần chú ý"
            className="no-scrollbar -mx-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 xl:grid-cols-3"
        >
            {attentionItems.map((item) => (
                <div
                    key={item.key}
                    className="flex min-w-[84%] snap-start items-start gap-3 rounded-xl border border-border bg-card p-3 sm:min-w-[60%] md:min-w-0"
                >
                    <span
                        className={cn(
                            "flex size-8 shrink-0 items-center justify-center rounded-lg",
                            TONE_CLASS[item.tone],
                        )}
                    >
                        {ICONS[item.icon]}
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold leading-snug">{item.title}</p>
                        <p className="money-value text-xs text-muted-foreground">{item.description}</p>
                        {item.payCard || item.rolloverCard || item.journeyCard ? (
                            <div className="mt-2 flex flex-wrap gap-2">
                                {item.payCard ? (
                                    <Button
                                        size="small"
                                        icon={<ArrowLeftRight className="size-3.5" />}
                                        onClick={() =>
                                            handlePayCard(item.payCard!._id, item.payCard!.amount)
                                        }
                                    >
                                        Thanh toán
                                    </Button>
                                ) : null}
                                {item.rolloverCard ? (
                                    <Button
                                        size="small"
                                        icon={<RefreshCw className="size-3.5" />}
                                        onClick={() => openRollover(item.rolloverCard!._id)}
                                    >
                                        Đáo hạn
                                    </Button>
                                ) : null}
                                {item.journeyCard ? (
                                    <Link href={`${MENU_KEY.ROLLOVER_JOURNEY}?cardId=${item.journeyCard._id}`}>
                                        <Button size="small" icon={<ChartLine className="size-3.5" />}>
                                            Phân tích
                                        </Button>
                                    </Link>
                                ) : null}
                            </div>
                        ) : null}
                    </div>
                </div>
            ))}
        </section>
    );
}
