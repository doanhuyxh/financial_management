"use client";

import TransfersContextProvider from "@/components/features/transfers/context";
import TransfersHeader from "@/components/features/transfers/components/header";
import TransfersTable from "@/components/features/transfers/components/transfers-table";
import TransferFormModal from "@/components/features/transfers/components/transfer-form-modal";
import TransfersInsights from "@/components/features/transfers/components/insights";

export default function TransfersComponent() {
    return (
        <TransfersContextProvider>
            <div className="flex flex-col gap-4">
                <TransfersHeader />
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
                    <TransfersTable />
                    <TransfersInsights />
                </div>
                <TransferFormModal />
            </div>
        </TransfersContextProvider>
    );
}
