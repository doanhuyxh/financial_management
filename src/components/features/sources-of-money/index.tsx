"use client";

import SourcesOfMoneyContextProvider from "@/components/features/sources-of-money/context";
import SourcesOfMoneyHeader from "@/components/features/sources-of-money/components/header";
import SourcesSummary from "@/components/features/sources-of-money/components/sources-summary";
import SourcesOfMoneyTable from "@/components/features/sources-of-money/components/sources-of-money-table";
import SourcesOfMoneyFormModal from "@/components/features/sources-of-money/components/sources-of-money-form-modal";
import SourcesTransferFormModal from "@/components/features/sources-of-money/components/transfer-form-modal";
import SourceHistoryModal from "@/components/features/sources-of-money/components/source-history-modal";
import ShareLinksModal from "@/components/features/sources-of-money/components/share-links-modal";
import BankQrModal from "@/components/features/sources-of-money/components/bank-qr-modal";
import SourcesCardRolloverModal from "@/components/features/sources-of-money/components/card-rollover-modal";

export default function SourcesOfMoneyComponent() {
    return (
        <SourcesOfMoneyContextProvider>
            <div className="flex flex-col gap-4">
                <SourcesSummary />
                <SourcesOfMoneyHeader />
                <SourcesOfMoneyTable />
                <SourcesOfMoneyFormModal />
                <SourcesTransferFormModal />
                <SourceHistoryModal />
                <ShareLinksModal />
                <BankQrModal />
                <SourcesCardRolloverModal />
            </div>
        </SourcesOfMoneyContextProvider>
    );
}
