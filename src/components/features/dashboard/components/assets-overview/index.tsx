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
                    icon={<PiggyBank className="size-4 text-muted-foreground" />}
                    value={money(assets.totalAssets)}
                    description="Tiền mặt + tín dụng có thể dùng"
                />
                <AssetTile
                    label="Tiền mặt"
                    icon={<Banknote className="size-4 text-muted-foreground" />}
                    value={money(assets.cashTotal)}
                    description={`${assets.cashSources.length} nguồn · ngân hàng, ví, tiền mặt`}
                />
                <AssetTile
                    label="Tín dụng có thể dùng"
                    icon={<CreditCard className="size-4 text-credit" />}
                    value={money(assets.availableCreditTotal)}
                    valueClassName="text-credit"
                    description={
                        <>
                            <Progress
                                percent={creditRemainingPercent}
                                showInfo={false}
                                size="small"
                                strokeColor="var(--credit)"
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
                    valueClassName={assets.netWorth < 0 ? "text-debt" : undefined}
                    description="Tiền mặt − dư nợ thẻ"
                />
            </div>
            <AssetsBreakdown />
        </div>
    );
}
