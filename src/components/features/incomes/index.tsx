"use client";

import IncomesContextProvider from "@/components/features/incomes/context";
import IncomesHeader from "@/components/features/incomes/components/header";
import IncomesTable from "@/components/features/incomes/components/incomes-table";
import IncomesFormModal from "@/components/features/incomes/components/incomes-form-modal";

export default function IncomesComponent() {
    return (
        <IncomesContextProvider>
            <div className="flex flex-col gap-4">
                <IncomesHeader />
                <IncomesTable />
                <IncomesFormModal />
            </div>
        </IncomesContextProvider>
    );
}
