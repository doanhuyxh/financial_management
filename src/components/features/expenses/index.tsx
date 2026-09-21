"use client";

import ExpensesContextProvider from "@/components/features/expenses/context";
import ExpensesHeader from "@/components/features/expenses/components/header";
import ExpensesTable from "@/components/features/expenses/components/expenses-table";
import ExpensesFormModal from "@/components/features/expenses/components/expenses-form-modal";

export default function ExpensesComponent() {
    return (
        <ExpensesContextProvider>
            <div className="flex flex-col gap-4">
                <ExpensesHeader />
                <ExpensesTable />
                <ExpensesFormModal />
            </div>
        </ExpensesContextProvider>
    );
}
