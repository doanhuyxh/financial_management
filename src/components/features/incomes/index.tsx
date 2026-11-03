"use client";

import IncomesContextProvider from "@/components/features/incomes/context";
import IncomesHeader from "@/components/features/incomes/components/header";
import IncomesTable from "@/components/features/incomes/components/incomes-table";
import IncomesFormModal from "@/components/features/incomes/components/incomes-form-modal";
import IncomesInsights from "@/components/features/incomes/components/insights";

export default function IncomesComponent() {
    return (
        <IncomesContextProvider>
            <div className="flex flex-col gap-4">
                <IncomesHeader />
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
                    <IncomesTable />
                    <IncomesInsights />
                </div>
                <IncomesFormModal />
            </div>
        </IncomesContextProvider>
    );
}
