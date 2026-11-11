"use client";

import type { ReactNode } from "react";
import EmptyState from "@/components/common/empty-state";
import LoadingOverlay from "@/components/common/loading-overlay";
import AppPagination, { type IPaginationProps } from "@/components/common/pagination";

type MobileRecordListProps<T> = {
    items: T[];
    loading?: boolean;
    rowKey: (item: T) => string;
    renderItem: (item: T) => ReactNode;
    pagination?: IPaginationProps;
};

export default function MobileRecordList<T>({
    items,
    loading,
    rowKey,
    renderItem,
    pagination,
}: MobileRecordListProps<T>) {
    return (
        <LoadingOverlay loading={Boolean(loading)}>
            {items.length === 0 ? (
                <EmptyState description="Không có dữ liệu" />
            ) : (
                <div className="flex flex-col gap-1.5">
                    {items.map((item) => (
                        <div
                            key={rowKey(item)}
                            className="w-full rounded-xl border border-border bg-card p-3"
                        >
                            {renderItem(item)}
                        </div>
                    ))}
                </div>
            )}
            {pagination && (pagination.total ?? 0) > 0 ? (
                <div className="mt-3 flex justify-center">
                    <AppPagination {...pagination} simple showSizeChanger={false} />
                </div>
            ) : null}
        </LoadingOverlay>
    );
}
