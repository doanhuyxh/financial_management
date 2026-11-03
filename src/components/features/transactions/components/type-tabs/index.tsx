"use client";

import { useRouter } from "next/navigation";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { useTransactionType } from "@/components/features/transactions/hooks/useTransactionType";
import { buildTransactionsUrl, type TransactionType } from "@/libs/utils/transactionsUrl";
import { cn } from "@/libs/shadcn/utils";

const TABS: {
    value: TransactionType;
    label: string;
    icon: LucideIcon;
    /** Class khi đang chọn: màu theo nghĩa (chi đỏ, thu xanh, chuyển tiền dùng màu nhấn) */
    activeClass: string;
    iconClass: string;
}[] = [
    {
        value: "expense",
        label: "Chi tiêu",
        icon: ArrowUpRight,
        activeClass: "border-money-out/50 bg-money-out-soft text-money-out",
        iconClass: "bg-money-out text-white",
    },
    {
        value: "income",
        label: "Thu nhập",
        icon: ArrowDownLeft,
        activeClass: "border-money-in/50 bg-money-in-soft text-money-in",
        iconClass: "bg-money-in text-white",
    },
    {
        value: "transfer",
        label: "Chuyển tiền",
        icon: ArrowLeftRight,
        activeClass: "border-primary/50 bg-primary-soft text-accent-text",
        iconClass: "bg-primary text-primary-foreground",
    },
];

/**
 * Chọn loại giao dịch (tab lớn có icon + màu theo loại). Đổi tab = thay `?type=` và bỏ các tham số
 * khác (bộ lọc, action=create...).
 */
export default function TypeTabs() {
    const router = useRouter();
    const type = useTransactionType();

    return (
        <div role="tablist" aria-label="Loại giao dịch" className="grid grid-cols-3 gap-2 sm:flex">
            {TABS.map((tab) => {
                const active = tab.value === type;
                const Icon = tab.icon;
                return (
                    <button
                        key={tab.value}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => !active && router.replace(buildTransactionsUrl(tab.value))}
                        className={cn(
                            // Mobile: icon trên chữ để 3 tab không bị cắt chữ; từ sm nằm ngang
                            "flex min-w-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-[13px] font-semibold transition-colors sm:min-w-40 sm:flex-row sm:justify-start sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm",
                            active
                                ? tab.activeClass
                                : "border-border bg-card text-muted-foreground hover:border-foreground/20 hover:text-foreground",
                        )}
                    >
                        <span
                            aria-hidden
                            className={cn(
                                "flex size-7 shrink-0 items-center justify-center rounded-lg transition-colors",
                                active ? tab.iconClass : "bg-muted text-muted-foreground",
                            )}
                        >
                            <Icon className="size-4" />
                        </span>
                        <span className="truncate">{tab.label}</span>
                    </button>
                );
            })}
        </div>
    );
}
