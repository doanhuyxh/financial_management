"use client";

import TransfersContextProvider from "@/components/features/transfers/context";
import TransfersHeader from "@/components/features/transfers/components/header";
import TransfersTable from "@/components/features/transfers/components/transfers-table";
import TransferFormModal from "@/components/features/transfers/components/transfer-form-modal";

export default function TransfersComponent() {
    return (
        <TransfersContextProvider>
            <div className="flex flex-col gap-4">
                <TransfersHeader />
                <TransfersTable />
                <TransferFormModal />
            </div>
        </TransfersContextProvider>
    );
}
