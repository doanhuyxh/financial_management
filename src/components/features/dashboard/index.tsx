"use client";

import DashboardContextProvider from "@/components/features/dashboard/context";
import DashboardHeader from "@/components/features/dashboard/components/header";
import AssetsOverview from "@/components/features/dashboard/components/assets-overview";
import CreditCardDebts from "@/components/features/dashboard/components/credit-card-debts";
import CategoryPieChart from "@/components/features/dashboard/components/category-pie-chart";
import SourcePieChart from "@/components/features/dashboard/components/source-pie-chart";
import DailyBarChart from "@/components/features/dashboard/components/daily-bar-chart";
import CashflowOverview from "@/components/features/dashboard/components/cashflow-overview";
import IncomePieChart from "@/components/features/dashboard/components/income-pie-chart";
import BudgetWatch from "@/components/features/dashboard/components/budget-watch";

export default function DashboardComponent() {
    return (
        <DashboardContextProvider>
            <div className="flex flex-col gap-4">
                <DashboardHeader />
                <div className="flex flex-col gap-4">
                    <AssetsOverview />
                    <CashflowOverview />
                    <BudgetWatch />
                    <CreditCardDebts />
                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                        <CategoryPieChart />
                        <SourcePieChart />
                    </div>
                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                        <IncomePieChart />
                        <DailyBarChart />
                    </div>
                </div>
            </div>
        </DashboardContextProvider>
    );
}
