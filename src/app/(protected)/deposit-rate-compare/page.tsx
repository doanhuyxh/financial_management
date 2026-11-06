import { Suspense } from "react";
import RouteLoading from "@/components/common/route-loading";
import DepositRateCompareComponent from "@/components/features/deposit-rate-compare";

export const metadata = {
    title: "So sánh lãi suất",
    description: "So sánh lãi suất gửi tiết kiệm giữa các ngân hàng",
};

export default function DepositRateComparePage() {
    return (
        <Suspense fallback={<RouteLoading />}>
            <DepositRateCompareComponent />
        </Suspense>
    );
}
