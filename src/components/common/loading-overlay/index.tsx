import type { ReactNode } from "react";
import { Spinner } from "@/components/shadcn/ui/spinner";
import { cn } from "@/libs/shadcn/utils";

interface ILoadingOverlayProps {
    loading?: boolean;
    children: ReactNode;
    className?: string;
}

/** Phủ mờ + spinner lên nội dung đang tải lại (thay `<Spin spinning>` của antd). */
export default function LoadingOverlay({ loading = false, children, className }: ILoadingOverlayProps) {
    return (
        <div className={cn("relative", className)} aria-busy={loading || undefined}>
            {children}
            {loading ? (
                <div className="absolute inset-0 z-10 flex items-start justify-center rounded-xl bg-background/50 pt-10">
                    <Spinner className="size-6 text-primary" />
                </div>
            ) : null}
        </div>
    );
}
