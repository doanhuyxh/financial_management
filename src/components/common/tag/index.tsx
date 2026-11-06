import type { ReactNode } from "react";
import { cn } from "@/libs/shadcn/utils";

/** Màu nhãn theo nghĩa (thay `color` của antd Tag). */
export type TagColor =
    | "default"
    | "green"
    | "red"
    | "orange"
    | "blue"
    | "purple"
    | "warning"
    | "success"
    | "error";

const SOFT_CLASS: Record<TagColor, string> = {
    default: "border-border bg-muted text-muted-foreground",
    green: "border-money-in/30 bg-money-in-soft text-money-in",
    success: "border-money-in/30 bg-money-in-soft text-money-in",
    red: "border-money-out/30 bg-money-out-soft text-money-out",
    error: "border-debt/30 bg-debt-soft text-debt",
    orange: "border-warn/30 bg-warn-soft text-warn",
    warning: "border-warn/30 bg-warn-soft text-warn",
    blue: "border-credit/30 bg-credit-soft text-credit",
    purple: "border-violet-600/30 bg-violet-600/10 text-violet-700 dark:text-violet-300",
};

const SOLID_CLASS: Record<TagColor, string> = {
    default: "border-transparent bg-muted-foreground text-background",
    green: "border-transparent bg-money-in text-white",
    success: "border-transparent bg-money-in text-white",
    red: "border-transparent bg-money-out text-white",
    error: "border-transparent bg-debt text-white",
    orange: "border-transparent bg-warn text-white",
    warning: "border-transparent bg-warn text-white",
    blue: "border-transparent bg-credit text-white",
    purple: "border-transparent bg-violet-600 text-white",
};

interface ITagProps {
    color?: TagColor;
    /** `solid`: nền đậm chữ trắng; mặc định nền nhạt */
    variant?: "soft" | "solid";
    className?: string;
    children?: ReactNode;
}

/** Nhãn nhỏ (loại giao dịch, trạng thái phí…). */
export default function Tag({ color = "default", variant = "soft", className, children }: ITagProps) {
    return (
        <span
            className={cn(
                "inline-flex h-5 w-fit shrink-0 items-center gap-1 rounded-md border px-1.5 text-xs leading-none font-medium whitespace-nowrap",
                (variant === "solid" ? SOLID_CLASS : SOFT_CLASS)[color],
                className,
            )}
        >
            {children}
        </span>
    );
}
