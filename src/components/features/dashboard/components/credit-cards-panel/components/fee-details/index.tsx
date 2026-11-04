"use client";

import type { ICreditCardFeeItem } from "@/components/features/dashboard/utils";
import AnnualFeeInfo from "@/components/features/dashboard/components/credit-cards-panel/components/annual-fee-info";
import ManagementFeeInfo from "@/components/features/dashboard/components/credit-cards-panel/components/management-fee-info";
import ManagementWaiver from "@/components/features/dashboard/components/credit-cards-panel/components/management-waiver";
import LatePenaltyInfo from "@/components/features/dashboard/components/credit-cards-panel/components/late-penalty-info";
import UsageFeeInfo from "@/components/features/dashboard/components/credit-cards-panel/components/usage-fee-info";
import PaymentFeeInfo from "@/components/features/dashboard/components/credit-cards-panel/components/payment-fee-info";
import WaiverProgress from "@/components/features/dashboard/components/credit-cards-panel/components/waiver-progress";
import RecordFeeButton from "@/components/features/dashboard/components/credit-cards-panel/components/record-fee-button";
import RolloverInfo from "@/components/features/dashboard/components/credit-cards-panel/components/rollover-info";
import { AnnualFeeWaiverPeriod } from "@/libs/interfaces/sourcesOfMoneyData";
import { formatMoney } from "@/libs/utils/formatMoney";

/** Mục phí người dùng được ẩn/hiện (lưu trong localStorage, key cũ của bảng phí). */
export const FEE_SECTIONS = [
    { key: "annualFee", label: "Phí thường niên" },
    { key: "annualFeeWaiver", label: "Miễn phí thường niên" },
    { key: "managementFee", label: "Phí quản lý" },
    { key: "managementFeeWaiver", label: "Miễn phí quản lý" },
    { key: "paymentFee", label: "Phí thanh toán dư nợ" },
    { key: "usageFee", label: "Phí sử dụng" },
    { key: "latePenalty", label: "Lãi & chậm trả" },
    { key: "rollover", label: "Đáo hạn" },
];

function Section({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="min-w-0">
            <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
            <div className="text-sm">{children}</div>
        </div>
    );
}

/** Chi tiết phí của một thẻ, hiện khi mở rộng dòng thẻ. */
export default function FeeDetails({
    item,
    hiddenKeys,
}: {
    item: ICreditCardFeeItem;
    hiddenKeys: string[];
}) {
    const isShown = (key: string) => !hiddenKeys.includes(key);
    const cycle = `${item.cycleStart.format("DD/MM")} – ${item.cycleEnd.subtract(1, "day").format("DD/MM")}`;
    const hasAnnual = item.annualFee != null || Boolean(item.nextAnnualFeeDate);

    return (
        <div className="flex flex-col gap-4 rounded-lg bg-muted/60 p-3 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                    Kỳ sao kê <span className="font-medium text-foreground">{cycle}</span> · phí là
                    ước tính; khi ngân hàng thu, bấm &quot;Ghi phí&quot; và sửa số thực tế
                </span>
                <RecordFeeButton item={item} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {isShown("annualFee") && hasAnnual ? (
                    <Section label="Phí thường niên">
                        <AnnualFeeInfo item={item} />
                    </Section>
                ) : null}
                {isShown("annualFeeWaiver") && item.annualFeeWaiver ? (
                    <Section label="Miễn phí thường niên">
                        <WaiverProgress
                            waiver={item.annualFeeWaiver}
                            label={
                                item.annualFeeWaiverPeriod === AnnualFeeWaiverPeriod.MONTH
                                    ? "Chi tiêu kỳ này"
                                    : "Chi tiêu năm thẻ"
                            }
                            format={formatMoney}
                        />
                    </Section>
                ) : null}
                {isShown("managementFee") && item.managementFee != null ? (
                    <Section label="Phí quản lý">
                        <ManagementFeeInfo item={item} />
                    </Section>
                ) : null}
                {isShown("managementFeeWaiver") && item.managementFeeWaiver ? (
                    <Section label="Miễn phí quản lý">
                        <ManagementWaiver waiver={item.managementFeeWaiver} />
                    </Section>
                ) : null}
                {isShown("paymentFee") && item.paymentFee ? (
                    <Section label="Phí thanh toán dư nợ">
                        <PaymentFeeInfo status={item.paymentFee} />
                    </Section>
                ) : null}
                {isShown("usageFee") && item.usageFee ? (
                    <Section label="Phí sử dụng">
                        <UsageFeeInfo status={item.usageFee} />
                    </Section>
                ) : null}
                {isShown("latePenalty") && item.latePenalty ? (
                    <Section label="Lãi & chậm trả">
                        <LatePenaltyInfo penalty={item.latePenalty} />
                    </Section>
                ) : null}
                {isShown("rollover") && item.rollover ? (
                    <Section label="Đáo hạn">
                        <RolloverInfo status={item.rollover} cardId={item._id} />
                    </Section>
                ) : null}
            </div>
        </div>
    );
}
