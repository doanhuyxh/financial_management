"use client";

import ExpensesContextProvider from "@/components/features/expenses/context";
import ExpensesHeader from "@/components/features/expenses/components/header";
import ExpensesTable from "@/components/features/expenses/components/expenses-table";
import ExpensesFormModal from "@/components/features/expenses/components/expenses-form-modal";
import ExpensesInsights from "@/components/features/expenses/components/insights";

export default function ExpensesComponent() {
    return (
        <ExpensesContextProvider>
            <div className="flex flex-col gap-4">
                <ExpensesHeader />
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
                    <ExpensesTable />
                    <ExpensesInsights />
                </div>
                <ExpensesFormModal />
            </div>
        </ExpensesContextProvider>
    );
}
