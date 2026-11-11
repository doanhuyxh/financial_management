"use client";

import { useMemo, type ReactNode } from "react";
import dayjs from "dayjs";
import EmptyState from "@/components/common/empty-state";
import LoadingOverlay from "@/components/common/loading-overlay";
import Money, { type MoneyKind } from "@/components/common/money";
import AppPagination, { type IPaginationProps } from "@/components/common/pagination";
import { Skeleton } from "@/components/shadcn/ui/skeleton";
import type { IDayTotal } from "@/libs/interfaces/ApiResponseData";
import { useIsMobile } from "@/libs/hooks/use-mobile";
import { cn } from "@/libs/shadcn/utils";

const WEEKDAYS = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"];

/** Số dòng skeleton khi tải lần đầu */
const SKELETON_ROWS = 6;

/** "Chủ nhật, 01/11" (thêm năm khi khác năm hiện tại) */
function formatDayLabel(key: string) {
    const date = dayjs(key);
    const pattern = date.year() === dayjs().year() ? "DD/MM" : "DD/MM/YYYY";
    return `${WEEKDAYS[date.day()]}, ${date.format(pattern)}`;
}

interface IGroupedTransactionListProps<T> {
    items: T[];
    loading?: boolean;
    rowKey: (item: T) => string;
    getDate: (item: T) => string | Date | undefined;
    /** Tổng mỗi ngày từ API (tính trên toàn bộ kết quả lọc); thiếu thì cộng trong trang */
    dayTotals?: IDayTotal[];
    getAmount: (item: T) => number;
    /** Màu + dấu của tổng ngày */
    totalKind: MoneyKind;
    renderRow: (item: T) => ReactNode;
    pagination?: IPaginationProps;
    empty?: ReactNode;
}

/**
 * Danh sách giao dịch nhóm theo ngày (giờ trình duyệt), mỗi nhóm có tiêu đề "Thứ, DD/MM" và tổng ngày.
 * Dùng cho cả desktop và mobile.
 */
export default function GroupedTransactionList<T>({
    items,
    loading,
    rowKey,
    getDate,
    dayTotals,
    getAmount,
    totalKind,
    renderRow,
    pagination,
    empty,
}: IGroupedTransactionListProps<T>) {
    const isMobile = useIsMobile();

    const groups = useMemo(() => {
        const totalByDay = new Map((dayTotals ?? []).map((day) => [day.date, day.total]));
        const result: { key: string; items: T[]; total: number }[] = [];
        for (const item of items) {
            const value = getDate(item);
            const key = value ? dayjs(value).format("YYYY-MM-DD") : "unknown";
            let group = result[result.length - 1];
            if (!group || group.key !== key) {
                group = { key, items: [], total: totalByDay.get(key) ?? 0 };
                result.push(group);
            }
            group.items.push(item);
        }
        // Thiếu tổng từ API thì cộng các khoản trong trang
        if (!dayTotals?.length) {
            for (const group of result) {
                group.total = group.items.reduce((sum, item) => sum + getAmount(item), 0);
            }
        }
        return result;
    }, [items, dayTotals, getDate, getAmount]);

    if (loading && items.length === 0) {
        return (
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
                {Array.from({ length: SKELETON_ROWS }, (_, index) => (
                    <Skeleton
                        key={index}
                        className={cn(
                            "skeleton-shimmer h-4 animate-none",
                            index === SKELETON_ROWS - 1 ? "w-3/5" : "w-full",
                        )}
                    />
                ))}
            </div>
        );
    }

    return (
        <LoadingOverlay loading={Boolean(loading)}>
            {groups.length === 0 ? (
                <div className="rounded-xl border border-border bg-card py-10">
                    {empty ?? <EmptyState description="Không có giao dịch" />}
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {groups.map((group) => (
                        <section
                            key={group.key}
                            className="overflow-hidden rounded-xl border border-border bg-card"
                        >
                            <header className="flex items-center justify-between gap-3 bg-muted px-4 py-2 text-xs font-semibold text-muted-foreground">
                                <span>
                                    {group.key === "unknown" ? "Không rõ ngày" : formatDayLabel(group.key)}
                                </span>
                                <Money
                                    value={totalKind === "out" ? -group.total : group.total}
                                    kind={totalKind}
                                    signed={totalKind === "out" || totalKind === "in"}
                                />
                            </header>
                            <ul>
                                {group.items.map((item) => (
                                    <li
                                        key={rowKey(item)}
                                        className="border-t border-border first:border-t-0"
                                    >
                                        {renderRow(item)}
                                    </li>
                                ))}
                            </ul>
                        </section>
                    ))}
                </div>
            )}
            {pagination && (pagination.total ?? 0) > 0 ? (
                <div className="mt-4 flex justify-center md:justify-end">
                    <AppPagination
                        {...pagination}
                        simple={isMobile}
                        showSizeChanger={!isMobile}
                        pageSizeOptions={[10, 20, 50]}
                    />
                </div>
            ) : null}
        </LoadingOverlay>
    );
}
