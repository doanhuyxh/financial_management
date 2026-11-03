"use client";

import type { ReactNode } from "react";
import { Button, Dropdown } from "antd";
import type { MenuProps } from "antd";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/libs/shadcn/utils";

interface ITransactionRowProps {
    /** Màu nền ô icon (màu danh mục) */
    color: string;
    /** Ký tự / icon trong ô (chữ cái đầu danh mục, emoji…) */
    icon: ReactNode;
    title: ReactNode;
    subtitle?: ReactNode;
    amount: ReactNode;
    /** Bấm dòng (VD: mở form sửa). Không có thì dòng không bấm được. */
    onClick?: () => void;
    /** Menu "⋯" (Sửa, Xóa…) */
    actions?: MenuProps["items"];
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
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1 font-medium">{title}</div>
                {subtitle ? (
                    <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
                ) : null}
            </div>
            <div className="shrink-0 text-right font-semibold">{amount}</div>
            {lockedHint ? (
                <span className="w-16 shrink-0 text-right text-[11px] leading-tight text-muted-foreground">
                    {lockedHint}
                </span>
            ) : actions?.length ? (
                // Chặn click lan ra dòng (dòng bấm = sửa)
                <div onClick={(event) => event.stopPropagation()} className="shrink-0">
                    <Dropdown
                        trigger={["click"]}
                        placement="bottomRight"
                        menu={{ items: actions, onClick: ({ key }) => onAction?.(key) }}
                    >
                        <Button
                            type="text"
                            size="small"
                            aria-label="Thao tác"
                            className="text-muted-foreground"
                            icon={<MoreHorizontal className="size-4" />}
                        />
                    </Dropdown>
                </div>
            ) : (
                <span className="hidden w-8 shrink-0 md:block" />
            )}
        </div>
    );
}
