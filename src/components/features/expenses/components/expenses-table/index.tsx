"use client";

import { useMemo } from "react";
import { Button, Space, Table, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import { Pencil, Trash2 } from "lucide-react";
import MobileRecordList from "@/components/common/mobile-record-list";
import FeeTag from "@/components/features/expenses/components/expenses-table/components/fee-tag";
import { useExpensesContext } from "@/components/features/expenses/context";
import {
    getExpenseCategory,
    getExpenseSource,
} from "@/components/features/expenses/utils";
import { useIsMobile } from "@/libs/hooks/use-mobile";
import type { IExpensesData } from "@/libs/interfaces/expensesData";
import Money from "@/components/common/money";
import { formatDate } from "@/libs/utils/formatDate";

const FEE_LOCKED_HINT = "Phí chuyển tiền: xóa giao dịch chuyển tiền gốc để thay đổi";

export default function ExpensesTable() {
    const {
        items,
        page,
        pageSize,
        pagination,
        isLoading,
        handleTableChange,
        openEditModal,
        handleDelete,
    } = useExpensesContext();
    const isMobile = useIsMobile();

    const columns: ColumnsType<IExpensesData> = useMemo(
        () => [
            {
                title: "Ngày chi",
                dataIndex: "spentAt",
                key: "spentAt",
                width: 120,
                render: (value?: string) =>
                    formatDate(value),
            },
            {
                title: "Số tiền",
                dataIndex: "amount",
                key: "amount",
                width: 140,
                align: "right",
                render: (amount: number) => (
                    <Money value={amount} kind="out" className="font-semibold" />
                ),
            },
            {
                title: "Danh mục",
                key: "category",
                render: (_value, record) => (
                    <div className="flex flex-col gap-0.5">
                        <span>{getExpenseCategory(record)?.name ?? "—"}</span>
                        <FeeTag record={record} />
                    </div>
                ),
            },
            {
                title: "Nguồn tiền",
                key: "source",
                render: (_value, record) => {
                    const source = getExpenseSource(record);
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
                    <Tooltip title={record.skipBalanceAdjust ? FEE_LOCKED_HINT : undefined}>
                        <Space size="small">
                            <Button
                                type="text"
                                size="small"
                                aria-label="Sửa chi tiêu"
                                disabled={record.skipBalanceAdjust}
                                icon={<Pencil className="size-4" />}
                                onClick={() => openEditModal(record)}
                            />
                            <Button
                                type="text"
                                size="small"
                                danger
                                aria-label="Xóa chi tiêu"
                                disabled={record.skipBalanceAdjust}
                                icon={<Trash2 className="size-4" />}
                                onClick={() => handleDelete(record)}
                            />
                        </Space>
                    </Tooltip>
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
                    const source = getExpenseSource(record);
                    return (
                        <div className="flex flex-col gap-1">
                            <div className="flex items-start justify-between gap-3">
                                <span className="flex flex-wrap items-center gap-1 font-semibold">
                                    {getExpenseCategory(record)?.name ?? "—"}
                                    <FeeTag record={record} />
                                </span>
                                <Money value={record.amount} kind="out" className="font-semibold" />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {formatDate(record.spentAt)}
                                {" · "}
                                {source?.name ?? "—"}
                            </p>
                            <div className="flex items-end justify-between gap-2">
                                <p className="line-clamp-2 text-xs text-muted-foreground">
                                    {record.note || "Không có ghi chú"}
                                </p>
                                {record.skipBalanceAdjust ? (
                                    <span className="shrink-0 text-xs text-muted-foreground">
                                        Sửa qua chuyển tiền
                                    </span>
                                ) : (
                                    <Space size="small">
                                        <Button
                                            type="text"
                                            size="middle"
                                            aria-label="Sửa chi tiêu"
                                            className="size-10"
                                            icon={<Pencil className="size-4" />}
                                            onClick={() => openEditModal(record)}
                                        />
                                        <Button
                                            type="text"
                                            size="middle"
                                            danger
                                            aria-label="Xóa chi tiêu"
                                            className="size-10"
                                            icon={<Trash2 className="size-4" />}
                                            onClick={() => handleDelete(record)}
                                        />
                                    </Space>
                                )}
                            </div>
                        </div>
                    );
                }}
            />
        );
    }

    return (
        <Table<IExpensesData>
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
                showTotal: (total) => `Tổng ${total} khoản chi`,
            }}
            onChange={handleTableChange}
        />
    );
}
