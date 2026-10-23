"use client";

import { Skeleton } from "antd";
import { ArrowDownLeft, ArrowUpRight, PiggyBank, Scale } from "lucide-react";
import { useDashboardContext } from "@/components/features/dashboard/context";
import AssetTile from "@/components/features/dashboard/components/assets-overview/components/asset-tile";
import CashflowTrendChart from "@/components/features/dashboard/components/cashflow-overview/components/cashflow-trend-chart";
import ChangeText from "@/components/features/dashboard/components/cashflow-overview/components/change-text";
import { formatMoney, formatPercent } from "@/libs/utils/formatMoney";

/** % thay đổi so với tháng trước; null khi tháng trước bằng 0 (không so được). */
function getChangeRatio(current: number, previous: number | undefined) {
    if (!previous) return null;
    return (current - previous) / Math.abs(previous);
}

export default function CashflowOverview() {
    const { cashflow, isCashflowLoading, monthValue } = useDashboardContext();

    const money = (value: number | undefined) =>
        isCashflowLoading || value === undefined ? (
            <Skeleton.Input active size="small" />
        ) : (
            formatMoney(value)
        );

    const previous = cashflow?.previous ?? undefined;
    const net = cashflow?.net ?? 0;

    return (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-background p-4">
            <div>
                <h2 className="text-base font-semibold">Dòng tiền</h2>
                <p className="text-xs text-muted-foreground">
                    Tháng {monthValue.format("MM/YYYY")} · thu nhập so với chi tiêu (gồm phí chuyển
                    tiền)
                </p>
            </div>

            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                <AssetTile
                    label="Thu nhập"
                    icon={<ArrowDownLeft className="size-4 text-green-500" />}
                    value={money(cashflow?.totalIncome)}
                    valueClassName="text-green-500"
                    description={
                        cashflow ? (
                            <ChangeText
                                ratio={getChangeRatio(cashflow.totalIncome, previous?.totalIncome)}
                                higherIsBetter
                            />
                        ) : null
                    }
                />
                <AssetTile
                    label="Chi tiêu"
                    icon={<ArrowUpRight className="size-4 text-red-500" />}
                    value={money(cashflow?.totalExpense)}
                    valueClassName="text-red-500"
                    description={
                        cashflow ? (
                            <ChangeText
                                ratio={getChangeRatio(cashflow.totalExpense, previous?.totalExpense)}
                                higherIsBetter={false}
                            />
                        ) : null
                    }
                />
                <AssetTile
                    highlight
                    label="Dòng tiền ròng"
                    icon={<Scale className="size-4 text-primary" />}
                    value={money(cashflow?.net)}
                    valueClassName={net < 0 ? "text-red-500" : "text-primary"}
                    description={
                        previous ? `Tháng trước: ${formatMoney(previous.net)}` : "Thu nhập − chi tiêu"
                    }
                />
                <AssetTile
                    label="Tỷ lệ tiết kiệm"
                    icon={<PiggyBank className="size-4 text-blue-500" />}
                    value={
                        isCashflowLoading || !cashflow ? (
                            <Skeleton.Input active size="small" />
                        ) : cashflow.savingsRate === null ? (
                            "—"
                        ) : (
                            formatPercent(cashflow.savingsRate)
                        )
                    }
                    valueClassName={
                        (cashflow?.savingsRate ?? 0) < 0 ? "text-red-500" : "text-blue-500"
                    }
                    description={
                        cashflow?.savingsRate === null
                            ? "Chưa có thu nhập trong tháng"
                            : "Dòng tiền ròng / thu nhập"
                    }
                />
            </div>

            <CashflowTrendChart />
        </div>
    );
}
