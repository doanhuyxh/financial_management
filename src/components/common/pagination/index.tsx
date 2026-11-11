"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/shadcn/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/shadcn/ui/select";
import { cn } from "@/libs/shadcn/utils";

/** Trang + cỡ trang do bảng/danh sách báo lên (thay `TablePaginationConfig` của antd). */
export type IPageChange = { current?: number; pageSize?: number };

/** Props phân trang dùng chung cho danh sách (thay `PaginationProps` của antd). */
export interface IPaginationProps {
    current?: number;
    pageSize?: number;
    total?: number;
    onChange?: (page: number, pageSize: number) => void;
    /** Chỉ "‹ 1/5 ›", không hiện dãy số trang */
    simple?: boolean;
    showSizeChanger?: boolean;
    pageSizeOptions?: number[];
    className?: string;
}

const DEFAULT_PAGE_SIZES = [10, 20, 50];

/** Dãy số trang có "…": luôn có trang đầu/cuối, 1 trang hai bên trang hiện tại. */
function buildPages(current: number, pageCount: number): (number | "ellipsis")[] {
    if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index + 1);
    const pages = new Set<number>([1, pageCount, current - 1, current, current + 1]);
    if (current <= 3) [2, 3, 4].forEach((page) => pages.add(page));
    if (current >= pageCount - 2) [pageCount - 3, pageCount - 2, pageCount - 1].forEach((page) => pages.add(page));
    const sorted = [...pages].filter((page) => page >= 1 && page <= pageCount).sort((a, b) => a - b);
    const result: (number | "ellipsis")[] = [];
    sorted.forEach((page, index) => {
        if (index > 0 && page - (sorted[index - 1] as number) > 1) result.push("ellipsis");
        result.push(page);
    });
    return result;
}

/** Phân trang: nút ‹ ›, số trang (hoặc "1/5" khi `simple`), chọn cỡ trang. */
export default function AppPagination({
    current = 1,
    pageSize = 10,
    total = 0,
    onChange,
    simple = false,
    showSizeChanger = false,
    pageSizeOptions = DEFAULT_PAGE_SIZES,
    className,
}: IPaginationProps) {
    const pageCount = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
    const page = Math.min(Math.max(1, current), pageCount);
    const goTo = (next: number) => {
        if (next < 1 || next > pageCount || next === page) return;
        onChange?.(next, pageSize);
    };

    return (
        <nav aria-label="Phân trang" className={cn("flex items-center gap-1", className)}>
            <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Trang trước"
                disabled={page <= 1}
                onClick={() => goTo(page - 1)}
            >
                <ChevronLeft />
            </Button>
            {simple ? (
                <span className="px-1 text-sm tabular-nums">
                    {page} / {pageCount}
                </span>
            ) : (
                buildPages(page, pageCount).map((item, index) =>
                    item === "ellipsis" ? (
                        <span key={`ellipsis-${index}`} className="px-1 text-sm text-muted-foreground">
                            …
                        </span>
                    ) : (
                        <Button
                            key={item}
                            type="button"
                            variant={item === page ? "outline" : "ghost"}
                            size="icon"
                            aria-current={item === page ? "page" : undefined}
                            className={cn("tabular-nums", item === page && "border-primary text-accent-text")}
                            onClick={() => goTo(item)}
                        >
                            {item}
                        </Button>
                    ),
                )
            )}
            <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Trang sau"
                disabled={page >= pageCount}
                onClick={() => goTo(page + 1)}
            >
                <ChevronRight />
            </Button>
            {showSizeChanger ? (
                <Select
                    value={String(pageSize)}
                    onValueChange={(value) => onChange?.(1, Number(value))}
                >
                    <SelectTrigger size="sm" className="ml-1 w-fit" aria-label="Số dòng mỗi trang">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {pageSizeOptions.map((size) => (
                            <SelectItem key={size} value={String(size)}>
                                {size} / trang
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            ) : null}
        </nav>
    );
}
