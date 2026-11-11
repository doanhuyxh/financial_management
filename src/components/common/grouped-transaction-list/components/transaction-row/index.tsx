"use client";

import type { ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import ActionMenu, { type IActionMenuItem } from "@/components/common/action-menu";
import { Button } from "@/components/shadcn/ui/button";
import { cn } from "@/libs/shadcn/utils";

interface ITransactionRowProps {
    /** Màu nền ô icon (màu danh mục) */
    color: string;
    /** Ký tự / icon trong ô (chữ cái đầu danh mục, emoji…) */
    icon: ReactNode;
    title: ReactNode;
    /** Dòng phụ dưới tiêu đề; khi có `columns` thì chỉ hiện dưới lg */
    subtitle?: ReactNode;
    /**
     * Cột thông tin trên màn hình ≥ lg (VD: [nguồn, ghi chú]). Cột đầu cố định, cột cuối giãn lấp
     * chỗ trống; dưới lg các cột ẩn và dùng `subtitle`.
     */
    columns?: ReactNode[];
    amount: ReactNode;
    /** Bấm dòng (VD: mở form sửa). Không có thì dòng không bấm được. */
    onClick?: () => void;
    /** Menu "⋯" (Sửa, Xóa…) */
    actions?: IActionMenuItem[];
    onAction?: (key: string) => void;
    /** Ghi chú nhỏ thay cho menu khi dòng bị khóa */
    lockedHint?: ReactNode;
}

/** Một dòng giao dịch: icon danh mục · tiêu đề + phụ đề · số tiền · menu "⋯". */
export default function TransactionRow({
    color,
    icon,
    title,
    subtitle,
    columns,
    amount,
    onClick,
    actions,
    onAction,
    lockedHint,
}: ITransactionRowProps) {
    const clickable = Boolean(onClick);
    return (
        <div
            role={clickable ? "button" : undefined}
            tabIndex={clickable ? 0 : undefined}
            onClick={onClick}
            onKeyDown={
                clickable
                    ? (event) => {
                          if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              onClick?.();
                          }
                      }
                    : undefined
            }
            className={cn(
                "group flex items-center gap-3 px-4 py-2.5 outline-none",
                clickable && "cursor-pointer hover:bg-background focus-visible:bg-background",
            )}
        >
            <span
                aria-hidden
                className="flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold"
                style={{ backgroundColor: `${color}1f`, color }}
            >
                {icon}
            </span>
            <div className={cn("min-w-0 flex-1", columns?.length && "lg:w-64 lg:flex-none")}>
                <div className="flex flex-wrap items-center gap-1 font-medium">{title}</div>
                {subtitle ? (
                    <p
                        className={cn(
                            "truncate text-xs text-muted-foreground",
                            columns?.length && "lg:hidden",
                        )}
                    >
                        {subtitle}
                    </p>
                ) : null}
            </div>
            {columns?.map((column, index) => (
                <div
                    key={index}
                    className={cn(
                        "hidden min-w-0 truncate text-sm text-muted-foreground lg:block",
                        index === columns.length - 1 ? "flex-1" : "w-52 shrink-0",
                    )}
                >
                    {column || "—"}
                </div>
            ))}
            <div className="shrink-0 text-right font-semibold">{amount}</div>
            {lockedHint ? (
                <span className="w-16 shrink-0 text-right text-[11px] leading-tight text-muted-foreground">
                    {lockedHint}
                </span>
            ) : actions?.length ? (
                // Chặn click/phím lan ra dòng (dòng bấm = sửa)
                <div
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                    className="shrink-0"
                >
                    <ActionMenu items={actions} onClick={(key) => onAction?.(key)} align="end">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Thao tác"
                            className="text-muted-foreground"
                        >
                            <MoreHorizontal className="size-4" />
                        </Button>
                    </ActionMenu>
                </div>
            ) : (
                <span className="hidden w-7 shrink-0 md:block" />
            )}
        </div>
    );
}
