"use client";

import { Progress, Skeleton } from "antd";
import { Banknote, CreditCard, PiggyBank, Scale } from "lucide-react";
import { useDashboardContext } from "@/components/features/dashboard/context";
import AssetTile from "@/components/features/dashboard/components/assets-overview/components/asset-tile";
import AssetsBreakdown from "@/components/features/dashboard/components/assets-overview/components/assets-breakdown";
import { formatMoney } from "@/libs/utils/formatMoney";

export default function AssetsOverview() {
    const { assets, isSourcesLoading } = useDashboardContext();

    const money = (value: number) =>
        isSourcesLoading ? <Skeleton.Input active size="small" /> : formatMoney(value);

    const creditRemainingPercent = assets.creditLimitTotal
        ? Math.round((assets.availableCreditTotal / assets.creditLimitTotal) * 100)
        : 0;

    return (
        <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                <AssetTile
                    highlight
                    label="Tổng tài sản"
                    icon={<PiggyBank className="size-4 text-primary" />}
                    value={money(assets.totalAssets)}
                    description="Tiền mặt + tín dụng có thể dùng"
                />
                <AssetTile
                    label="Tiền mặt"
                    icon={<Banknote className="size-4 text-green-500" />}
                    value={money(assets.cashTotal)}
                    valueClassName="text-green-500"
                    description={`${assets.cashSources.length} nguồn · ngân hàng, ví, tiền mặt`}
                />
                <AssetTile
                    label="Tín dụng có thể dùng"
                    icon={<CreditCard className="size-4 text-blue-500" />}
                    value={money(assets.availableCreditTotal)}
                    valueClassName="text-blue-500"
                    description={
                        <>
                            <Progress
                                percent={creditRemainingPercent}
                                showInfo={false}
                                size="small"
                                strokeColor="#3b82f6"
                                className="m-0"
                            />
                            Còn {creditRemainingPercent}% của{" "}
                            {formatMoney(assets.creditLimitTotal)}
                        </>
                    }
                />
                <AssetTile
                    label="Tài sản ròng"
                    icon={<Scale className="size-4 text-muted-foreground" />}
                    value={money(assets.netWorth)}
                    valueClassName={assets.netWorth < 0 ? "text-red-500" : undefined}
                    description="Tiền mặt − dư nợ thẻ"
                />
            </div>
            <AssetsBreakdown />
        </div>
    );
}
