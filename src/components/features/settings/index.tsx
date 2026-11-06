"use client";

import { Bot, History, Lock } from "lucide-react";
import SettingsContextProvider from "@/components/features/settings/context";
import LedgerLockCard from "@/components/features/settings/components/ledger-lock-card";
import McpTokensCard from "@/components/features/settings/components/mcp-tokens-card";
import TransactionAuditList from "@/components/features/settings/components/transaction-audit-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/shadcn/ui/tabs";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/libs/shadcn/utils";

/** Tab trang Cài đặt, đồng bộ với `?tab=` (pages.md) */
const SETTINGS_TABS = [
    { value: "lock", label: "Khóa sổ", icon: Lock, content: <LedgerLockCard /> },
    { value: "audit", label: "Lịch sử", icon: History, content: <TransactionAuditList /> },
    { value: "mcp", label: "Kết nối agent", icon: Bot, content: <McpTokensCard /> },
] as const;

/**
 * Kiểu tab Bootstrap: đường kẻ dưới thanh tab chính là viền trên của khung nội dung (khung kéo lên 1px,
 * thanh tab nằm trên và trong suốt), nên tab đang chọn có nền `card` đè lên viền để nối liền với khung.
 * Tràn thì cuộn ngang, ẩn thanh cuộn.
 */
const TAB_LIST_CLASS =
    "relative z-10 w-full justify-start gap-0 overflow-x-auto overflow-y-hidden rounded-none bg-transparent p-0 group-data-horizontal/tabs:h-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";
const TAB_TRIGGER_CLASS =
    "h-auto flex-none rounded-t-md rounded-b-none px-3 py-2 text-muted-foreground shadow-none hover:border-border/60 hover:text-foreground data-active:border-border data-active:border-b-card data-active:bg-card data-active:text-foreground group-data-[variant=default]/tabs-list:data-active:shadow-none dark:data-active:border-border dark:data-active:border-b-card dark:data-active:bg-card";
/** Khung nội dung: viền thường thay ring, kéo lên 1px để viền trên nằm dưới thanh tab. Góc trên-trái vuông khi tab đầu đang chọn */
const TAB_CONTENT_CLASS =
    "-mt-px [&>[data-slot=card]]:border [&>[data-slot=card]]:border-border [&>[data-slot=card]]:ring-0";
const TAB_CONTENT_FIRST_ACTIVE_CLASS = "[&>[data-slot=card]]:rounded-tl-none";

type SettingsTab = (typeof SETTINGS_TABS)[number]["value"];
const DEFAULT_TAB: SettingsTab = "lock";

function isSettingsTab(value: string): value is SettingsTab {
    return SETTINGS_TABS.some((tab) => tab.value === value);
}

export default function SettingsComponent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const tabParam = searchParams.get("tab") ?? DEFAULT_TAB;
    const activeTab = isSettingsTab(tabParam) ? tabParam : DEFAULT_TAB;

    // Như type-tabs của /transactions: router.replace mới làm useSearchParams cập nhật (trang static nên không gọi server)
    const handleTabChange = (value: string) => {
        if (value === activeTab) return;
        router.replace(`/settings?tab=${value}`, { scroll: false });
    };

    return (
        <SettingsContextProvider>
            <Tabs
                value={activeTab}
                onValueChange={handleTabChange}
                className="mx-auto flex w-full max-w-3xl flex-col gap-0"
            >
                <TabsList className={TAB_LIST_CLASS}>
                    {SETTINGS_TABS.map(({ value, label, icon: Icon }) => (
                        <TabsTrigger key={value} value={value} className={TAB_TRIGGER_CLASS}>
                            <Icon data-icon="inline-start" />
                            {label}
                        </TabsTrigger>
                    ))}
                </TabsList>
                {SETTINGS_TABS.map(({ value, content }) => (
                    <TabsContent
                        key={value}
                        value={value}
                        className={cn(
                            TAB_CONTENT_CLASS,
                            value === SETTINGS_TABS[0].value && TAB_CONTENT_FIRST_ACTIVE_CLASS,
                        )}
                    >
                        {content}
                    </TabsContent>
                ))}
            </Tabs>
        </SettingsContextProvider>
    );
}
