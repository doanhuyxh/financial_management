"use client";

import SourcesOfMoneyContextProvider from "@/components/features/sources-of-money/context";
import SourcesOfMoneyHeader from "@/components/features/sources-of-money/components/header";
import SourcesOfMoneyTable from "@/components/features/sources-of-money/components/sources-of-money-table";
import SourcesOfMoneyFormModal from "@/components/features/sources-of-money/components/sources-of-money-form-modal";

export default function SourcesOfMoneyComponent() {
    return (
        <SourcesOfMoneyContextProvider>
            <div className="flex flex-col gap-4">
                <SourcesOfMoneyHeader />
                <SourcesOfMoneyTable />
                <SourcesOfMoneyFormModal />
            </div>
        </SourcesOfMoneyContextProvider>
    );
}
