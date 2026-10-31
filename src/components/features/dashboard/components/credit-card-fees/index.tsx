"use client";

import { Button, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { Receipt } from "lucide-react";
import MobileRecordList from "@/components/common/mobile-record-list";
import { useDashboardContext } from "@/components/features/dashboard/context";
import type { ICreditCardFeeItem } from "@/components/features/dashboard/utils";
import AnnualFeeInfo from "@/components/features/dashboard/components/credit-card-fees/components/annual-fee-info";
import ManagementFeeInfo from "@/components/features/dashboard/components/credit-card-fees/components/management-fee-info";
import ManagementWaiver from "@/components/features/dashboard/components/credit-card-fees/components/management-waiver";
import LatePenaltyInfo from "@/components/features/dashboard/components/credit-card-fees/components/late-penalty-info";
import UsageFeeInfo from "@/components/features/dashboard/components/credit-card-fees/components/usage-fee-info";
import PaymentFeeInfo from "@/components/features/dashboard/components/credit-card-fees/components/payment-fee-info";
import WaiverProgress from "@/components/features/dashboard/components/credit-card-fees/components/waiver-progress";
import { useIsMobile } from "@/libs/hooks/use-mobile";
import { formatMoney } from "@/libs/utils/formatMoney";
import { CardFeeType } from "@/libs/interfaces/expensesData";
import { AnnualFeeWaiverPeriod } from "@/libs/interfaces/sourcesOfMoneyData";

function renderAnnualWaiver(item: ICreditCardFeeItem) {
    const label =
        item.annualFeeWaiverPeriod === AnnualFeeWaiverPeriod.MONTH
            ? "Chi tiêu kỳ này"
            : "Chi tiêu năm thẻ";
    return <WaiverProgress waiver={item.annualFeeWaiver} label={label} format={formatMoney} />;
}

function renderCycle(item: ICreditCardFeeItem) {
    return `${item.cycleStart.format("DD/MM")} – ${item.cycleEnd.subtract(1, "day").format("DD/MM")}`;
}

export default function CreditCardFees() {
    const { creditCardFees, isSourcesLoading, handleRecordCardFee } = useDashboardContext();
    const isMobile = useIsMobile();

    // Chỉ hiện khi có thẻ đã cấu hình phí
    if (isSourcesLoading || creditCardFees.length === 0) return null;

    const renderActions = (item: ICreditCardFeeItem) => (
        <div className="flex flex-wrap justify-end gap-2">
            {item.annualFee != null || item.nextAnnualFeeDate ? (
                <Button
                    size="small"
                    icon={<Receipt className="size-4" />}
                    onClick={() => handleRecordCardFee(item, CardFeeType.ANNUAL_FEE)}
                >
                    Ghi phí thường niên
                </Button>
            ) : null}
            {item.managementFee != null ? (
                <Button
                    size="small"
                    icon={<Receipt className="size-4" />}
                    onClick={() => handleRecordCardFee(item, CardFeeType.MANAGEMENT_FEE)}
                >
                    Ghi phí quản lý
                </Button>
            ) : null}
            {item.paymentFee && item.paymentFee.estimatedTotal > 0 ? (
                <Button
                    size="small"
                    icon={<Receipt className="size-4" />}
                    onClick={() => handleRecordCardFee(item, CardFeeType.PAYMENT_FEE)}
                >
                    Ghi phí thanh toán
                </Button>
            ) : null}
            {item.usageFee?.charged ? (
                <Button
                    size="small"
                    icon={<Receipt className="size-4" />}
                    onClick={() => handleRecordCardFee(item, CardFeeType.USAGE_FEE)}
                >
                    Ghi phí sử dụng
                </Button>
            ) : null}
            {item.latePenalty?.interestRate != null ? (
                <Button
                    size="small"
                    icon={<Receipt className="size-4" />}
                    onClick={() => handleRecordCardFee(item, CardFeeType.INTEREST)}
                >
                    Ghi lãi
                </Button>
            ) : null}
            {item.latePenalty &&
            (item.latePenalty.lateFeePercentPerDay != null || item.latePenalty.lateFeeMin != null) ? (
                <Button
                    size="small"
                    icon={<Receipt className="size-4" />}
                    onClick={() => handleRecordCardFee(item, CardFeeType.LATE_FEE)}
                >
                    Ghi phí chậm trả
                </Button>
            ) : null}
        </div>
    );

    const columns: ColumnsType<ICreditCardFeeItem> = [
        {
            title: "Thẻ",
            dataIndex: "name",
            key: "name",
            render: (name: string, item) => (
                <div className="flex flex-col">
                    <span className="font-medium">{name}</span>
                    <span className="text-xs text-muted-foreground">Kỳ {renderCycle(item)}</span>
                </div>
            ),
        },
        {
            title: "Phí thường niên",
            key: "annualFee",
            render: (_, item) => <AnnualFeeInfo item={item} />,
        },
        {
            title: "Miễn phí thường niên",
            key: "annualFeeWaiver",
            render: (_, item) => renderAnnualWaiver(item),
        },
        {
            title: "Phí quản lý",
            key: "managementFee",
            render: (_, item) => <ManagementFeeInfo item={item} />,
        },
        {
            title: "Miễn phí quản lý",
            key: "managementFeeWaiver",
            render: (_, item) => <ManagementWaiver waiver={item.managementFeeWaiver} />,
        },
        {
            title: "Phí thanh toán dư nợ",
            key: "paymentFee",
            render: (_, item) => <PaymentFeeInfo status={item.paymentFee} />,
        },
        {
            title: "Phí sử dụng",
            key: "usageFee",
            render: (_, item) => <UsageFeeInfo status={item.usageFee} />,
        },
        {
            title: "Lãi & chậm trả",
            key: "latePenalty",
            render: (_, item) => <LatePenaltyInfo penalty={item.latePenalty} />,
        },
        {
            title: "",
            key: "actions",
            align: "right",
            render: (_, item) => renderActions(item),
        },
    ];

    return (
        <div className="rounded-xl border border-border bg-background p-4">
            <div className="mb-3">
                <h2 className="text-base font-semibold">Phí thẻ tín dụng</h2>
                <p className="text-xs text-muted-foreground">
                    Phí là ước tính. Khi ngân hàng thu, bấm &quot;Ghi phí&quot; và sửa số tiền thực
                    tế; khoản phí được cộng vào dư nợ thẻ và không tính vào điều kiện miễn phí.
                </p>
            </div>

            {isMobile ? (
                <MobileRecordList
                    items={creditCardFees}
                    rowKey={(item) => item._id}
                    renderItem={(item) => (
                        <div className="flex flex-col gap-3">
                            <div className="flex flex-col">
                                <span className="font-semibold">{item.name}</span>
                                <span className="text-xs text-muted-foreground">
                                    Kỳ {renderCycle(item)}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <p className="text-xs text-muted-foreground">Phí thường niên</p>
                                    <AnnualFeeInfo item={item} />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Phí quản lý</p>
                                    <ManagementFeeInfo item={item} />
                                </div>
                            </div>
                            {item.annualFeeWaiver ? renderAnnualWaiver(item) : null}
                            {item.managementFeeWaiver ? (
                                <ManagementWaiver waiver={item.managementFeeWaiver} />
                            ) : null}
                            {item.paymentFee ? (
                                <div className="text-sm">
                                    <p className="text-xs text-muted-foreground">
                                        Phí thanh toán dư nợ
                                    </p>
                                    <PaymentFeeInfo status={item.paymentFee} />
                                </div>
                            ) : null}
                            {item.usageFee ? (
                                <div className="text-sm">
                                    <p className="text-xs text-muted-foreground">Phí sử dụng</p>
                                    <UsageFeeInfo status={item.usageFee} />
                                </div>
                            ) : null}
                            {item.latePenalty ? (
                                <div className="text-sm">
                                    <p className="text-xs text-muted-foreground">Lãi & chậm trả</p>
                                    <LatePenaltyInfo penalty={item.latePenalty} />
                                </div>
                            ) : null}
                            {renderActions(item)}
                        </div>
                    )}
                />
            ) : (
                <Table<ICreditCardFeeItem>
                    rowKey="_id"
                    size="small"
                    columns={columns}
                    dataSource={creditCardFees}
                    pagination={false}
                    scroll={{ x: "max-content" }}
                />
            )}
        </div>
    );
}
