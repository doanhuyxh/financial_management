"use client";

import { useState, type ReactNode } from "react";
import { Plus, Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/shadcn/ui/button";
import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
} from "@/components/shadcn/ui/drawer";
import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupInput,
} from "@/components/shadcn/ui/input-group";
import { useIsMobile } from "@/libs/hooks/use-mobile";

type MobileFilterShellProps = {
    searchValue: string;
    onSearchChange: (value: string) => void;
    searchPlaceholder: string;
    activeFilterCount?: number;
    desktopFilters?: ReactNode;
    drawerFilters?: ReactNode;
    onClearFilters?: () => void;
    createLabel: string;
    onCreate: () => void;
    extraActions?: ReactNode;
    /** Dòng tổng hợp dưới thanh lọc (VD: dải tổng của danh sách giao dịch) */
    summary?: ReactNode;
    /** Chip bộ lọc đang bật (chỉ hiện trên mobile, vì desktop đã thấy ô lọc trên toolbar) */
    activeFilters?: ReactNode;
    /**
     * Mobile: hiện nút "+" cạnh ô tìm kiếm. Tắt ở trang giao dịch vì nút "+" của thanh điều hướng dưới
     * đã tạo đúng loại đang xem.
     */
    mobileCreate?: boolean;
};

export default function MobileFilterShell({
    searchValue,
    onSearchChange,
    searchPlaceholder,
    activeFilterCount = 0,
    desktopFilters,
    drawerFilters,
    onClearFilters,
    createLabel,
    onCreate,
    extraActions,
    summary,
    activeFilters,
    mobileCreate = true,
}: MobileFilterShellProps) {
    const isMobile = useIsMobile();
    const [open, setOpen] = useState(false);
    const hasFilters = Boolean(drawerFilters);

    return (
        <>
            <div className="flex w-full min-w-0 flex-1 flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
                <div className="flex min-w-0 items-center gap-2">
                    <InputGroup className="min-w-0 flex-1 md:max-w-xs">
                        <InputGroupAddon>
                            <Search className="size-4 text-muted-foreground" />
                        </InputGroupAddon>
                        <InputGroupInput
                            placeholder={searchPlaceholder}
                            value={searchValue}
                            onChange={(event) => onSearchChange(event.target.value)}
                        />
                        {searchValue ? (
                            <InputGroupAddon align="inline-end">
                                <InputGroupButton
                                    size="icon-xs"
                                    aria-label="Xóa tìm kiếm"
                                    className="text-muted-foreground hover:text-foreground"
                                    onClick={() => onSearchChange("")}
                                >
                                    <X className="size-3.5" />
                                </InputGroupButton>
                            </InputGroupAddon>
                        ) : null}
                    </InputGroup>
                    {isMobile && hasFilters ? (
                        <div className="relative shrink-0">
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                aria-label="Bộ lọc"
                                onClick={() => setOpen(true)}
                            >
                                <SlidersHorizontal className="size-4" />
                            </Button>
                            {activeFilterCount > 0 ? (
                                <span className="pointer-events-none absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                                    {activeFilterCount}
                                </span>
                            ) : null}
                        </div>
                    ) : null}
                    {isMobile ? extraActions : null}
                    {isMobile && mobileCreate ? (
                        <Button
                            type="button"
                            size="icon"
                            aria-label={createLabel}
                            title={createLabel}
                            onClick={onCreate}
                        >
                            <Plus className="size-4" />
                        </Button>
                    ) : null}
                </div>
                {!isMobile ? desktopFilters : null}
                <div className="hidden flex-1 items-center justify-end gap-2 md:flex">
                    {extraActions}
                    <Button type="button" onClick={onCreate}>
                        <Plus data-icon="inline-start" className="size-4" />
                        {createLabel}
                    </Button>
                </div>
            </div>
            {isMobile ? activeFilters : null}
            {summary}
            {hasFilters ? (
                <Drawer open={open} onOpenChange={setOpen} direction="bottom">
                    <DrawerContent
                        className="bg-card"
                        // Không tự focus ô đầu tiên để bàn phím hệ thống không bật lên che bộ lọc
                        onOpenAutoFocus={(event) => event.preventDefault()}
                    >
                        <DrawerHeader className="border-b border-border py-3 text-left">
                            <DrawerTitle>Bộ lọc</DrawerTitle>
                            <DrawerDescription className="sr-only">Bộ lọc danh sách</DrawerDescription>
                        </DrawerHeader>
                        <div className="scrollbar-theme flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pt-3 pb-2">
                            {drawerFilters}
                        </div>
                        <DrawerFooter className="pb-safe flex-row gap-2 border-t border-border px-4 pt-3">
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full"
                                onClick={() => {
                                    onClearFilters?.();
                                    setOpen(false);
                                }}
                            >
                                Xoá lọc
                            </Button>
                            <Button type="button" className="w-full" onClick={() => setOpen(false)}>
                                Áp dụng
                            </Button>
                        </DrawerFooter>
                    </DrawerContent>
                </Drawer>
            ) : null}
        </>
    );
}
