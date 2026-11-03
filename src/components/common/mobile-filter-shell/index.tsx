"use client";

import { useState, type ReactNode } from "react";
import { Badge, Button, Drawer, Input } from "antd";
import { Plus, Search, SlidersHorizontal } from "lucide-react";
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
                    <Input
                        allowClear
                        prefix={<Search className="size-4 text-muted-foreground" />}
                        placeholder={searchPlaceholder}
                        value={searchValue}
                        onChange={(event) => onSearchChange(event.target.value)}
                        className="min-w-0 flex-1 md:max-w-xs"
                    />
                    {isMobile && hasFilters ? (
                        <Badge count={activeFilterCount} size="small">
                            <Button
                                aria-label="Bộ lọc"
                                icon={<SlidersHorizontal className="size-4" />}
                                onClick={() => setOpen(true)}
                            />
                        </Badge>
                    ) : null}
                    {isMobile ? extraActions : null}
                    {isMobile && mobileCreate ? (
                        <Button
                            type="primary"
                            aria-label={createLabel}
                            title={createLabel}
                            icon={<Plus className="size-4" />}
                            onClick={onCreate}
                        />
                    ) : null}
                </div>
                {!isMobile ? desktopFilters : null}
                <div className="hidden flex-1 items-center justify-end gap-2 md:flex">
                    {extraActions}
                    <Button type="primary" icon={<Plus className="size-4" />} onClick={onCreate}>
                        {createLabel}
                    </Button>
                </div>
            </div>
            {isMobile ? activeFilters : null}
            {summary}
            {hasFilters ? (
                <Drawer
                    title="Bộ lọc"
                    placement="bottom"
                    size="auto"
                    open={open}
                    onClose={() => setOpen(false)}
                    styles={{ body: { paddingBottom: 8 } }}
                    footer={
                        <div className="flex gap-2 pb-safe">
                            <Button
                                block
                                onClick={() => {
                                    onClearFilters?.();
                                    setOpen(false);
                                }}
                            >
                                Xoá lọc
                            </Button>
                            <Button block type="primary" onClick={() => setOpen(false)}>
                                Áp dụng
                            </Button>
                        </div>
                    }
                >
                    <div className="flex flex-col gap-3">{drawerFilters}</div>
                </Drawer>
            ) : null}
        </>
    );
}
