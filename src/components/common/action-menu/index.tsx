"use client";

import type { ReactNode } from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/shadcn/ui/dropdown-menu";

/** Một mục trong menu "⋯" (thay `MenuProps["items"]` của antd). */
export type IActionMenuItem =
    | {
          key: string;
          label: ReactNode;
          icon?: ReactNode;
          danger?: boolean;
          disabled?: boolean;
      }
    | { type: "divider"; key?: string };

interface IActionMenuProps {
    items: IActionMenuItem[];
    onClick: (key: string) => void;
    /** Phần tử bấm để mở menu (nút "⋯", …) */
    children: ReactNode;
    align?: "start" | "center" | "end";
    /** Gọi khi menu mở/đóng (VD: giữ hover trên dòng) */
    onOpenChange?: (open: boolean) => void;
}

/** Menu thao tác dạng danh sách `{ key, label, danger }` dùng cho dòng bảng, thẻ danh mục… */
export default function ActionMenu({ items, onClick, children, align = "end", onOpenChange }: IActionMenuProps) {
    return (
        <DropdownMenu onOpenChange={onOpenChange}>
            <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
            <DropdownMenuContent align={align}>
                {items.map((item, index) =>
                    "type" in item ? (
                        <DropdownMenuSeparator key={item.key ?? `divider-${index}`} />
                    ) : (
                        <DropdownMenuItem
                            key={item.key}
                            variant={item.danger ? "destructive" : "default"}
                            disabled={item.disabled}
                            onSelect={() => onClick(item.key)}
                        >
                            {item.icon}
                            {item.label}
                        </DropdownMenuItem>
                    ),
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
