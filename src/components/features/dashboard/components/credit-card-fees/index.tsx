"use client";

import { Button, Dropdown, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { ChevronDown, Receipt } from "lucide-react";
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
import ColumnSettings from "@/components/features/dashboard/components/credit-card-fees/components/column-settings";
import useLocalStorage from "@/libs/hooks/useLocalStorage";
import { configLocalStorageKey } from "@/libs/constants/configKey";
import { useIsMobile } from "@/libs/hooks/use-mobile";
import { formatMoney } from "@/libs/utils/formatMoney";
import { CardFeeType } from "@/libs/interfaces/expensesData";
import { AnnualFeeWaiverPeriod } from "@/libs/interfaces/sourcesOfMoneyData";

// Các cột người dùng được ẩn/hiện; "Thẻ" và nút "Ghi phí" luôn hiện
const FEE_COLUMNS = [
    { key: "annualFee", label: "Phí thường niên" },
    { key: "annualFeeWaiver", label: "Miễn phí thường niên" },
    { key: "managementFee", label: "Phí quản lý" },
    { key: "managementFeeWaiver", label: "Miễn phí quản lý" },
    { key: "paymentFee", label: "Phí thanh toán dư nợ" },
    { key: "usageFee", label: "Phí sử dụng" },
    { key: "latePenalty", label: "Lãi & chậm trả" },
];

function renderAnnualWaiver(item: ICreditCardFeeItem) {
    const label =
        item.annualFeeWaiverPeriod === AnnualFeeWaiverPeriod.MONTH
            ? "Chi tiêu kỳ này"
            : "Chi tiêu năm thẻ";
    return <WaiverProgress waiver={item.annualFeeWaiver} label={label} format={formatMoney} />;
}

// Kỳ sao kê cần dễ thấy; xanh dương để không trùng màu trạng thái phí
const CYCLE_CLASS = "text-xs font-medium text-sky-600 dark:text-sky-400";

function renderCycle(item: ICreditCardFeeItem) {
    return `${item.cycleStart.format("DD/MM")} – ${item.cycleEnd.subtract(1, "day").format("DD/MM")}`;
}

export default function CreditCardFees() {
    const { creditCardFees, isSourcesLoading, handleRecordCardFee } = useDashboardContext();
    const isMobile = useIsMobile();
    const [hiddenColumns, setHiddenColumns] = useLocalStorage<string[]>(
        configLocalStorageKey.DASHBOARD_CARD_FEE_HIDDEN_COLUMNS,
        [],
    );
    const isShown = (key: string) => !hiddenColumns.includes(key);

    // Chỉ hiện khi có thẻ đã cấu hình phí
    if (isSourcesLoading || creditCardFees.length === 0) return null;

    const renderActions = (item: ICreditCardFeeItem) => {
        const { latePenalty } = item;
        const actions = [
            {
                type: CardFeeType.ANNUAL_FEE,
                label: "Phí thường niên",
                visible: item.annualFee != null || Boolean(item.nextAnnualFeeDate),
            },
            {
                type: CardFeeType.MANAGEMENT_FEE,
                label: "Phí quản lý",
                visible: item.managementFee != null,
            },
            {
                type: CardFeeType.PAYMENT_FEE,
                label: "Phí thanh toán",
                visible: Boolean(item.paymentFee && item.paymentFee.estimatedTotal > 0),
            },
            {
                type: CardFeeType.USAGE_FEE,
                label: "Phí sử dụng",
                visible: Boolean(item.usageFee?.charged),
            },
            {
                type: CardFeeType.INTEREST,
                label: "Lãi",
                visible: latePenalty?.interestRate != null,
            },
            {
                type: CardFeeType.LATE_FEE,
                label: "Phí chậm trả",
                visible: Boolean(
                    latePenalty &&
                    (latePenalty.lateFeePercentPerDay != null || latePenalty.lateFeeMin != null),
                ),
            },
        ].filter((action) => action.visible);

        if (actions.length === 0) return null;

        return (
            <Dropdown
                trigger={["click"]}
                placement="bottomRight"
                menu={{
                    items: actions.map((action) => ({ key: action.type, label: action.label })),
                    onClick: ({ key }) => handleRecordCardFee(item, key as CardFeeType),
                }}
            >
                <Button size="small" icon={<Receipt className="size-4" />}>
                    Ghi phí <ChevronDown className="size-3.5" />
                </Button>
            </Dropdown>
        );
    };

    const allColumns: ColumnsType<ICreditCardFeeItem> = [
        {
            title: "Thẻ",
            dataIndex: "name",
            key: "name",
            render: (name: string, item) => (
                <div className="flex flex-col">
                    <span className="font-medium">{name}</span>
                    <span className={CYCLE_CLASS}>Kỳ {renderCycle(item)}</span>
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

    const columns = allColumns.filter((column) => isShown(String(column.key)));

    return (
        <div className="rounded-xl border border-border bg-background p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                    <h2 className="text-base font-semibold">Phí thẻ tín dụng</h2>
                    <p className="text-xs text-muted-foreground">
                        Phí là ước tính. Khi ngân hàng thu, bấm &quot;Ghi phí&quot; và sửa số tiền
                        thực tế; khoản phí được cộng vào dư nợ thẻ và không tính vào điều kiện miễn
                        phí.
                    </p>
                </div>
                <ColumnSettings
                    options={FEE_COLUMNS}
                    hiddenKeys={hiddenColumns}
                    onChange={setHiddenColumns}
                />
            </div>

            {isMobile ? (
                <MobileRecordList
                    items={creditCardFees}
                    rowKey={(item) => item._id}
                    renderItem={(item) => (
                        <div className="flex flex-col gap-3">
                            <div className="flex flex-col">
                                <span className="font-semibold">{item.name}</span>
                                <span className={CYCLE_CLASS}>
                                    Kỳ {renderCycle(item)}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                {isShown("annualFee") ? (
                                    <div>
                                        <p className="text-xs text-muted-foreground">
                                            Phí thường niên
                                        </p>
                                        <AnnualFeeInfo item={item} />
                                    </div>
                                ) : null}
                                {isShown("managementFee") ? (
                                    <div>
                                        <p className="text-xs text-muted-foreground">Phí quản lý</p>
                                        <ManagementFeeInfo item={item} />
                                    </div>
                                ) : null}
                            </div>
                            {isShown("annualFeeWaiver") && item.annualFeeWaiver
                                ? renderAnnualWaiver(item)
                                : null}
                            {isShown("managementFeeWaiver") && item.managementFeeWaiver ? (
                                <ManagementWaiver waiver={item.managementFeeWaiver} />
                            ) : null}
                            {isShown("paymentFee") && item.paymentFee ? (
                                <div className="text-sm">
                                    <p className="text-xs text-muted-foreground">
                                        Phí thanh toán dư nợ
                                    </p>
                                    <PaymentFeeInfo status={item.paymentFee} />
                                </div>
                            ) : null}
                            {isShown("usageFee") && item.usageFee ? (
                                <div className="text-sm">
                                    <p className="text-xs text-muted-foreground">Phí sử dụng</p>
                                    <UsageFeeInfo status={item.usageFee} />
                                </div>
                            ) : null}
                            {isShown("latePenalty") && item.latePenalty ? (
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
