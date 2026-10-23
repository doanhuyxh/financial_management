"use client";

import { useMemo } from "react";
import { Button, Space, Table, Tag, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import { Pencil, Trash2 } from "lucide-react";
import MobileRecordList from "@/components/common/mobile-record-list";
import { useExpensesContext } from "@/components/features/expenses/context";
import {
    formatMoney,
    getExpenseCategory,
    getExpenseSource,
} from "@/components/features/expenses/utils";
import { useIsMobile } from "@/libs/hooks/use-mobile";
import type { IExpensesData } from "@/libs/interfaces/expensesData";
import {
    SOURCES_OF_MONEY_TYPE_LABELS,
    SourcesOfMoneyType,
} from "@/libs/interfaces/sourcesOfMoneyData";

const FEE_LOCKED_HINT = "Phí chuyển tiền: xóa giao dịch chuyển tiền gốc để thay đổi";

function FeeTag() {
    return (
        <Tag color="orange" className="w-fit">
            Phí chuyển tiền
        </Tag>
    );
}

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
                title: "STT",
                key: "index",
                width: 64,
                responsive: ["md"],
                render: (_value, _record, index) => (page - 1) * pageSize + index + 1,
            },
            {
                title: "Ngày chi",
                dataIndex: "spentAt",
                key: "spentAt",
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
                    <span className="font-semibold text-rose-600">{formatMoney(amount)}</span>
                ),
            },
            {
                title: "Danh mục",
                key: "category",
                render: (_value, record) => (
                    <div className="flex flex-col gap-0.5">
                        <span>{getExpenseCategory(record)?.name ?? "—"}</span>
                        {record.skipBalanceAdjust && <FeeTag />}
                    </div>
                ),
            },
            {
                title: "Nguồn tiền",
                key: "source",
                render: (_value, record) => {
                    const source = getExpenseSource(record);
                    if (!source) return "—";
                    return (
                        <div className="flex flex-col gap-0.5">
                            <span>{source.name}</span>
                            <Tag className="hidden w-fit md:inline-flex">
                                {SOURCES_OF_MONEY_TYPE_LABELS[source.type as SourcesOfMoneyType] ??
                                    source.type}
                            </Tag>
                        </div>
                    );
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
                                    {record.skipBalanceAdjust && <FeeTag />}
                                </span>
                                <span className="font-semibold text-rose-600">
                                    {formatMoney(record.amount)}
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {record.spentAt
                                    ? new Date(record.spentAt).toLocaleDateString("vi-VN")
                                    : "—"}
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
