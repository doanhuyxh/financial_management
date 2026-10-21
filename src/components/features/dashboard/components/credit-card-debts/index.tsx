"use client";

import { Empty, Progress, Spin, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import MobileRecordList from "@/components/common/mobile-record-list";
import { useDashboardContext } from "@/components/features/dashboard/context";
import type {
    CreditDueStatus,
    ICreditCardDebtItem,
} from "@/components/features/dashboard/utils";
import { useIsMobile } from "@/libs/hooks/use-mobile";
import { formatMoney } from "@/libs/utils/formatMoney";

const STATUS_COLORS: Record<CreditDueStatus, string> = {
    today: "red",
    urgent: "red",
    soon: "orange",
    normal: "green",
    "no-due-date": "default",
};

function getStatusLabel(item: ICreditCardDebtItem) {
    switch (item.status) {
        case "today":
            return "Đến hạn hôm nay";
        case "urgent":
        case "soon":
            return `Sắp đến hạn · còn ${item.daysLeft} ngày`;
        case "normal":
            return `Còn ${item.daysLeft} ngày`;
        default:
            return "Chưa đặt ngày đến hạn";
    }
}

const columns: ColumnsType<ICreditCardDebtItem> = [
    {
        title: "Thẻ",
        dataIndex: "name",
        key: "name",
        render: (name: string) => <span className="font-medium">{name}</span>,
    },
    {
        title: "Dư nợ",
        dataIndex: "currentDebt",
        key: "currentDebt",
        align: "right",
        render: (value: number) => (
            <span className="font-medium text-red-500">
                {formatMoney(value)}
            </span>
        ),
    },
    {
        title: "Hạn mức sử dụng",
        key: "usage",
        width: 220,
        render: (_, item) => {
            const percent = item.creditLimit
                ? Math.round((item.currentDebt / item.creditLimit) * 100)
                : 0;
            return (
                <div className="min-w-40">
                    <Progress
                        percent={percent}
                        size="small"
                        status={percent >= 90 ? "exception" : "normal"}
                    />
                    <p className="text-xs text-muted-foreground">
                        Còn lại {formatMoney(item.availableCredit)}
                    </p>
                </div>
            );
        },
    },
    {
        title: "Ngày đến hạn",
        key: "nextDueDate",
        align: "center",
        render: (_, item) => item.nextDueDate?.format("DD/MM/YYYY") ?? "—",
    },
    {
        title: "Trạng thái",
        key: "status",
        align: "center",
        render: (_, item) => (
            <Tag color={STATUS_COLORS[item.status]} className="m-0">
                {getStatusLabel(item)}
            </Tag>
        ),
    },
];

export default function CreditCardDebts() {
    const { creditCardDebts, totalCreditDebt, isSourcesLoading } =
        useDashboardContext();
    const isMobile = useIsMobile();

    return (
        <div className="rounded-xl border border-border bg-background p-4">
            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h2 className="text-base font-semibold">Dư nợ thẻ tín dụng</h2>
                    <p className="text-xs text-muted-foreground">
                        Sắp xếp theo ngày đến hạn gần nhất
                    </p>
                </div>
                {creditCardDebts.length > 0 ? (
                    <p className="text-sm text-muted-foreground">
                        Tổng dư nợ:{" "}
                        <span className="font-medium text-red-500">
                            {formatMoney(totalCreditDebt)}
                        </span>
                    </p>
                ) : null}
            </div>

            {isSourcesLoading ? (
                <div className="flex h-32 items-center justify-center">
                    <Spin />
                </div>
            ) : creditCardDebts.length === 0 ? (
                <div className="flex h-32 items-center justify-center">
                    <Empty description="Không có thẻ tín dụng nào đang dư nợ" />
                </div>
            ) : isMobile ? (
                    <MobileRecordList
                        items={creditCardDebts}
                        rowKey={(item) => item._id}
                        renderItem={(item) => {
                            const percent = item.creditLimit
                                ? Math.round((item.currentDebt / item.creditLimit) * 100)
                                : 0;
                            return (
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-start justify-between gap-3">
                                        <span className="font-semibold">{item.name}</span>
                                        <span className="font-semibold text-red-500">
                                            {formatMoney(item.currentDebt)}
                                        </span>
                                    </div>
                                    <Progress
                                        percent={percent}
                                        size="small"
                                        status={percent >= 90 ? "exception" : "normal"}
                                    />
                                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                                        <span>
                                            {item.nextDueDate?.format("DD/MM/YYYY") ?? "Chưa có hạn"}
                                        </span>
                                        <Tag color={STATUS_COLORS[item.status]} className="m-0">
                                            {getStatusLabel(item)}
                                        </Tag>
                                    </div>
                                </div>
                            );
                        }}
                    />
            ) : (
                <Table<ICreditCardDebtItem>
                    rowKey="_id"
                    size="small"
                    columns={columns}
                    dataSource={creditCardDebts}
                    pagination={false}
                    scroll={{ x: "max-content" }}
                />
            )}
        </div>
    );
}
