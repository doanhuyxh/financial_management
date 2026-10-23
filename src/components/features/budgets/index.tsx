"use client";

import BudgetsContextProvider from "@/components/features/budgets/context";
import BudgetsHeader from "@/components/features/budgets/components/header";
import BudgetList from "@/components/features/budgets/components/budget-list";
import BudgetFormModal from "@/components/features/budgets/components/budget-form-modal";

export default function BudgetsComponent() {
    return (
        <BudgetsContextProvider>
            <div className="flex flex-col gap-4">
                <BudgetsHeader />
                <BudgetList />
                <BudgetFormModal />
            </div>
        </BudgetsContextProvider>
    );
}
