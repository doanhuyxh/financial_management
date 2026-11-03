"use client";

import { Button } from "antd";
import { Plus } from "lucide-react";
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
            type="primary"
            icon={<Plus className="size-4" />}
            onClick={openQuickAdd}
            className="hidden! md:inline-flex!"
            title="Ghi giao dịch (phím N)"
        >
            Ghi giao dịch
            <kbd className="ml-1 rounded border border-white/40 px-1 text-[11px] leading-4 font-medium opacity-80">
                N
            </kbd>
        </Button>
    );
}
