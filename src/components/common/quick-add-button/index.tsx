"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/shadcn/ui/button";
import { useHotkey } from "@/libs/hooks/useHotkey";
import { useQuickAdd } from "@/libs/hooks/useQuickAdd";

/**
 * Nút "Ghi giao dịch" trên header (desktop) + phím tắt `N` ở mọi trang.
 * Mobile dùng nút "+" của thanh điều hướng dưới.
 */
export default function QuickAddButton() {
    const openQuickAdd = useQuickAdd();
    useHotkey("n", openQuickAdd);

    return (
        <Button
            type="button"
            onClick={openQuickAdd}
            className="hidden md:inline-flex"
            title="Ghi giao dịch (phím N)"
        >
            <Plus data-icon="inline-start" className="size-4" />
            Ghi giao dịch
            <kbd className="ml-1 rounded border border-white/40 px-1 text-[11px] leading-4 font-medium opacity-80">
                N
            </kbd>
        </Button>
    );
}
