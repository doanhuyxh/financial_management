"use client";

import type { ReactNode } from "react";
import { Card, Empty, Pagination, Spin } from "antd";
import type { PaginationProps } from "antd";

type MobileRecordListProps<T> = {
    items: T[];
    loading?: boolean;
    rowKey: (item: T) => string;
    renderItem: (item: T) => ReactNode;
    pagination?: PaginationProps;
};

export default function MobileRecordList<T>({
    items,
    loading,
    rowKey,
    renderItem,
    pagination,
}: MobileRecordListProps<T>) {
    return (
        <Spin spinning={!!loading}>
            {items.length === 0 ? (
                <Empty description="Không có dữ liệu" />
            ) : (
                <div className="flex flex-col gap-1.5">
                    {items.map((item) => (
                        <Card key={rowKey(item)} size="small" className="w-full">
                            {renderItem(item)}
                        </Card>
                    ))}
                </div>
            )}
            {pagination && (pagination.total ?? 0) > 0 ? (
                <div className="mt-3 flex justify-center">
                    <Pagination {...pagination} simple showSizeChanger={false} />
                </div>
            ) : null}
        </Spin>
    );
}
