"use client";

import { useState } from "react";
import { Button } from "antd";
import { ChevronDown, ChevronUp } from "lucide-react";
import { formatMoney } from "@/libs/utils/formatMoney";
import {
    AnnualFeeWaiverPeriod,
    type ISourcesOfMoneyData,
} from "@/libs/interfaces/sourcesOfMoneyData";

type CardFeeGroup = { title: string; items: string[] };

/** Phí thẻ (ước tính) và điều kiện miễn phí, mỗi loại phí một nhóm, mỗi ý một dòng. */
function getCardFeeGroups(record: ISourcesOfMoneyData): CardFeeGroup[] {
    const details = record.creditDetails;
    if (!details) return [];
    const pad = (value: number) => String(value).padStart(2, "0");
    const groups: CardFeeGroup[] = [];

    const annual: string[] = [];
    if (details.annualFeeDay && details.annualFeeMonth) {
        annual.push(`Thu ngày ${pad(details.annualFeeDay)}/${pad(details.annualFeeMonth)}`);
    }
    if (details.annualFeeWaiverPeriod && details.annualFeeWaiverMinSpend) {
        const period =
            details.annualFeeWaiverPeriod === AnnualFeeWaiverPeriod.MONTH ? "kỳ" : "năm";
        annual.push(`Miễn nếu chi ≥ ${formatMoney(details.annualFeeWaiverMinSpend)}/${period}`);
    }
    if (details.annualFee != null || annual.length > 0) {
        groups.push({
            title:
                details.annualFee != null
                    ? `Phí thường niên: ~${formatMoney(details.annualFee)}`
                    : "Phí thường niên",
            items: annual,
        });
    }

    const management: string[] = [];
    if (details.managementFeeDay) {
        management.push(`Thu ngày ${details.managementFeeDay} hằng tháng`);
    }
    const managementWaivers = [
        details.managementFeeWaiverMinTransactions
            ? `≥ ${details.managementFeeWaiverMinTransactions} giao dịch`
            : null,
        details.managementFeeWaiverMinSpend
            ? `chi ≥ ${formatMoney(details.managementFeeWaiverMinSpend)}`
            : null,
    ].filter(Boolean);
    if (managementWaivers.length > 0) {
        management.push(`Miễn nếu ${managementWaivers.join(" hoặc ")}/kỳ`);
    }
    if (details.managementFee != null || management.length > 0) {
        groups.push({
            title:
                details.managementFee != null
                    ? `Phí quản lý: ~${formatMoney(details.managementFee)}/tháng`
                    : "Phí quản lý",
            items: management,
        });
    }

    if (details.paymentFee != null) {
        const freePayments = details.freePaymentsPerCycle ?? 0;
        groups.push({
            title: `Phí thanh toán dư nợ: ~${formatMoney(details.paymentFee)}/lần`,
            items: [
                freePayments > 0
                    ? `Miễn ${freePayments} lần đầu mỗi kỳ`
                    : "Thu mọi lần trả nợ",
            ],
        });
    }

    const percentFee = (label: string, percent?: number, min?: number) => {
        if (percent == null && min == null) return null;
        const parts = [
            percent != null ? `${percent}%` : null,
            min != null ? `tối thiểu ${formatMoney(min)}` : null,
        ].filter(Boolean);
        return `${label}: ${parts.join(", ")}`;
    };
    const lateFeeRange = [
        details.lateFeeMin != null ? `tối thiểu ${formatMoney(details.lateFeeMin)}` : null,
        details.lateFeeMax != null ? `tối đa ${formatMoney(details.lateFeeMax)}` : null,
    ].filter(Boolean);
    const others = [
        details.interestRate != null ? `Lãi suất: ${details.interestRate}%/năm` : null,
        details.lateFeePercentPerDay != null || lateFeeRange.length > 0
            ? `Chậm trả: ${details.lateFeePercentPerDay != null ? `${details.lateFeePercentPerDay}%/ngày` : ""}${lateFeeRange.length > 0 ? ` (${lateFeeRange.join(", ")})` : ""}`
            : null,
        percentFee("Rút tiền mặt", details.cashAdvanceFeePercent, details.cashAdvanceFeeMin),
        percentFee("Ngoại tệ", details.foreignFxFeePercent, details.foreignFxFeeMin),
        percentFee("VND tại ĐV nước ngoài", details.foreignVndFeePercent, details.foreignVndFeeMin),
    ].filter((item): item is string => Boolean(item));
    if (others.length > 0) {
        groups.push({ title: "Lãi & phí khác", items: others });
    }

    return groups;
}

/** Chi tiết phí của thẻ, mặc định thu gọn; bấm để mở/đóng. */
export default function CardFeeDetails({ record }: { record: ISourcesOfMoneyData }) {
    const [open, setOpen] = useState(false);
    const groups = getCardFeeGroups(record);
    if (groups.length === 0) return null;

    return (
        <div className="mt-1">
            <Button
                type="link"
                size="small"
                className="h-auto! p-0! text-xs!"
                icon={open ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                iconPlacement="end"
                aria-expanded={open}
                onClick={() => setOpen((value) => !value)}
            >
                {open ? "Ẩn chi tiết phí" : `Xem chi tiết phí (${groups.length})`}
            </Button>
            {open
                ? groups.map((group) => (
                      <div key={group.title} className="mt-1 text-xs text-blue-500">
                          <div className="font-medium">{group.title}</div>
                          {group.items.map((item) => (
                              <div key={item} className="pl-3">
                                  • {item}
                              </div>
                          ))}
                      </div>
                  ))
                : null}
        </div>
    );
}
