"use client";

import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/shadcn/ui/button";
import { usePrivacyMode } from "@/libs/hooks/usePrivacyMode";

/** Nút con mắt trên header: bật/tắt làm mờ số tiền (dùng nơi đông người). */
export default function PrivacyToggle() {
    const { enabled, toggle } = usePrivacyMode({ apply: true });

    return (
        <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={toggle}
            className="rounded-full border border-border/60 bg-background/80 shadow-sm"
            aria-pressed={enabled}
            aria-label={enabled ? "Hiện số tiền" : "Ẩn số tiền"}
            title={enabled ? "Hiện số tiền" : "Ẩn số tiền"}
        >
            {enabled ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </Button>
    );
}
