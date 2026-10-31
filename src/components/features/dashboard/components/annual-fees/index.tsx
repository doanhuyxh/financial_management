"use client";

import { Button, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { Receipt } from "lucide-react";
import MobileRecordList from "@/components/common/mobile-record-list";
import { useDashboardContext } from "@/components/features/dashboard/context";
import type { IAnnualFeeItem } from "@/components/features/dashboard/utils";
import { useIsMobile } from "@/libs/hooks/use-mobile";
import { formatMoney } from "@/libs/utils/formatMoney";

const STATUS_COLORS: Record<IAnnualFeeItem["status"], string> = {
    today: "red",
    urgent: "red",
    soon: "orange",
    normal: "default",
};

function getStatusLabel(item: IAnnualFeeItem) {
    return item.status === "today" ? "Thu hôm nay" : `Còn ${item.daysLeft} ngày`;
}

function formatEstimate(item: IAnnualFeeItem) {
    return item.annualFee != null ? `~${formatMoney(item.annualFee)}` : "Chưa nhập";
}

export default function AnnualFees() {
    const { annualFees, isSourcesLoading, handleRecordAnnualFee } = useDashboardContext();
    const isMobile = useIsMobile();

    // Chỉ hiện khi có thẻ đã đặt ngày thu phí
    if (isSourcesLoading || annualFees.length === 0) return null;

    const renderRecordButton = (item: IAnnualFeeItem) => (
        <Button
            size="small"
            icon={<Receipt className="size-4" />}
            onClick={() => handleRecordAnnualFee(item)}
        >
            Ghi nhận phí
        </Button>
    );

    const columns: ColumnsType<IAnnualFeeItem> = [
        {
            title: "Thẻ",
            dataIndex: "name",
            key: "name",
            render: (name: string) => <span className="font-medium">{name}</span>,
        },
        {
            title: "Phí ước tính",
            key: "annualFee",
            align: "right",
            render: (_, item) => formatEstimate(item),
        },
        {
            title: "Ngày thu kế tiếp",
            key: "nextFeeDate",
            align: "center",
            render: (_, item) => item.nextFeeDate.format("DD/MM/YYYY"),
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
        {
            title: "",
            key: "actions",
            align: "right",
            render: (_, item) => renderRecordButton(item),
        },
    ];

    return (
        <div className="rounded-xl border border-border bg-background p-4">
            <div className="mb-3">
                <h2 className="text-base font-semibold">Phí thường niên thẻ tín dụng</h2>
                <p className="text-xs text-muted-foreground">
                    Phí là ước tính. Khi ngân hàng thu, bấm &quot;Ghi nhận phí&quot; và sửa số
                    tiền thực tế; khoản phí được cộng vào dư nợ thẻ.
                </p>
            </div>

            {isMobile ? (
                <MobileRecordList
                    items={annualFees}
                    rowKey={(item) => item._id}
                    renderItem={(item) => (
                        <div className="flex flex-col gap-2">
                            <div className="flex items-start justify-between gap-3">
                                <span className="font-semibold">{item.name}</span>
                                <span className="font-semibold">{formatEstimate(item)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                                <span>{item.nextFeeDate.format("DD/MM/YYYY")}</span>
                                <Tag color={STATUS_COLORS[item.status]} className="m-0">
                                    {getStatusLabel(item)}
                                </Tag>
                            </div>
                            <div className="flex justify-end">{renderRecordButton(item)}</div>
                        </div>
                    )}
                />
            ) : (
                <Table<IAnnualFeeItem>
                    rowKey="_id"
                    size="small"
                    columns={columns}
                    dataSource={annualFees}
                    pagination={false}
                    scroll={{ x: "max-content" }}
                />
            )}
        </div>
    );
}
