"use client";

import { useMemo } from "react";
import { Button, Space, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { Pencil, Trash2 } from "lucide-react";
import MobileRecordList from "@/components/common/mobile-record-list";
import { useIncomesContext } from "@/components/features/incomes/context";
import { formatMoney, getIncomeCategory, getIncomeSource } from "@/components/features/incomes/utils";
import { useIsMobile } from "@/libs/hooks/use-mobile";
import type { IIncomesData } from "@/libs/interfaces/incomesData";

export default function IncomesTable() {
    const {
        items,
        page,
        pageSize,
        pagination,
        isLoading,
        handleTableChange,
        openEditModal,
        handleDelete,
    } = useIncomesContext();
    const isMobile = useIsMobile();

    const columns: ColumnsType<IIncomesData> = useMemo(
        () => [
            {
                title: "STT",
                key: "index",
                width: 64,
                responsive: ["md"],
                render: (_value, _record, index) => (page - 1) * pageSize + index + 1,
            },
            {
                title: "Ngày thu",
                dataIndex: "receivedAt",
                key: "receivedAt",
                width: 120,
                render: (value?: string) =>
                    value ? new Date(value).toLocaleDateString("vi-VN") : "—",
            },
            {
                title: "Số tiền",
                dataIndex: "amount",
                key: "amount",
                width: 140,
                render: (amount: number) => (
                    <span className="font-semibold text-emerald-600">{formatMoney(amount)}</span>
                ),
            },
            {
                title: "Danh mục",
                key: "category",
                render: (_value, record) => getIncomeCategory(record)?.name ?? "—",
            },
            {
                title: "Nguồn tiền",
                key: "source",
                render: (_value, record) => {
                    const source = getIncomeSource(record);
                    if (!source) return "—";
                    return <span>{source.name}</span>;
                },
            },
            {
                title: "Ghi chú",
                dataIndex: "note",
                key: "note",
                ellipsis: true,
                responsive: ["md"],
                render: (note?: string) => note || "—",
            },
            {
                title: "Thao tác",
                key: "actions",
                width: 120,
                align: "right",
                render: (_value, record) => (
                    <Space size="small">
                        <Button
                            type="text"
                            size="small"
                            aria-label="Sửa thu nhập"
                            icon={<Pencil className="size-4" />}
                            onClick={() => openEditModal(record)}
                        />
                        <Button
                            type="text"
                            size="small"
                            danger
                            aria-label="Xóa thu nhập"
                            icon={<Trash2 className="size-4" />}
                            onClick={() => handleDelete(record)}
                        />
                    </Space>
                ),
            },
        ],
        [page, pageSize, openEditModal, handleDelete],
    );

    const pager = {
        current: pagination?.page ?? page,
        pageSize: pagination?.limit ?? pageSize,
        total: pagination?.total ?? 0,
        onChange: (current: number, nextPageSize: number) =>
            handleTableChange({ current, pageSize: nextPageSize }),
    };

    if (isMobile) {
        return (
            <MobileRecordList
                items={items}
                loading={isLoading}
                rowKey={(item) => item._id}
                pagination={pager}
                renderItem={(record) => {
                    const source = getIncomeSource(record);
                    return (
                        <div className="flex flex-col gap-1">
                            <div className="flex items-start justify-between gap-3">
                                <span className="font-semibold">
                                    {getIncomeCategory(record)?.name ?? "—"}
                                </span>
                                <span className="font-semibold text-emerald-600">
                                    {formatMoney(record.amount)}
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {record.receivedAt
                                    ? new Date(record.receivedAt).toLocaleDateString("vi-VN")
                                    : "—"}
                                {" · "}
                                {source?.name ?? "—"}
                            </p>
                            <div className="flex items-end justify-between gap-2">
                                <p className="line-clamp-2 text-xs text-muted-foreground">
                                    {record.note || "Không có ghi chú"}
                                </p>
                                <Space size="small">
                                    <Button
                                        type="text"
                                        size="middle"
                                        aria-label="Sửa thu nhập"
                                        className="size-10"
                                        icon={<Pencil className="size-4" />}
                                        onClick={() => openEditModal(record)}
                                    />
                                    <Button
                                        type="text"
                                        size="middle"
                                        danger
                                        aria-label="Xóa thu nhập"
                                        className="size-10"
                                        icon={<Trash2 className="size-4" />}
                                        onClick={() => handleDelete(record)}
                                    />
                                </Space>
                            </div>
                        </div>
                    );
                }}
            />
        );
    }

    return (
        <Table<IIncomesData>
            rowKey="_id"
            size="middle"
            columns={columns}
            dataSource={items}
            loading={isLoading}
            scroll={{ x: "max-content" }}
            pagination={{
                ...pager,
                showSizeChanger: true,
                pageSizeOptions: [10, 20, 50],
                showTotal: (total) => `Tổng ${total} khoản thu`,
            }}
            onChange={handleTableChange}
        />
    );
}
