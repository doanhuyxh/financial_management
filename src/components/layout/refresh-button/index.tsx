"use client";

import { RefreshCw } from "lucide-react";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/shadcn/ui/button";
import { cn } from "@/libs/shadcn/utils";

/**
 * Nút làm mới trên header (plan 20): dữ liệu được giữ 5 phút trong RAM để tiết kiệm 4G, nên khi có
 * thay đổi từ ngoài app (MCP, thiết bị khác) bấm nút này để tải lại các dữ liệu đang hiện.
 */
export default function RefreshButton() {
    const queryClient = useQueryClient();
    const fetching = useIsFetching() > 0;

    return (
        <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={fetching}
            onClick={() => queryClient.invalidateQueries({ refetchType: "active" })}
            className="rounded-full border border-border/60 bg-background/80 shadow-sm"
            aria-label="Làm mới dữ liệu"
            title="Làm mới dữ liệu"
        >
            <RefreshCw className={cn("size-4", fetching && "animate-spin")} />
        </Button>
    );
}
