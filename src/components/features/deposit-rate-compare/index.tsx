"use client";

import DepositRateCompareContextProvider from "@/components/features/deposit-rate-compare/context";
import CompareContent from "@/components/features/deposit-rate-compare/components/compare-content";

export default function DepositRateCompareComponent() {
    return (
        <DepositRateCompareContextProvider>
            <CompareContent />
        </DepositRateCompareContextProvider>
    );
}
