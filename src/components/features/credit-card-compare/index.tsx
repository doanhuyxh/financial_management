"use client";

import CreditCardCompareContextProvider from "@/components/features/credit-card-compare/context";
import CompareContent from "@/components/features/credit-card-compare/components/compare-content";

export default function CreditCardCompareComponent() {
    return (
        <CreditCardCompareContextProvider>
            <CompareContent />
        </CreditCardCompareContextProvider>
    );
}
