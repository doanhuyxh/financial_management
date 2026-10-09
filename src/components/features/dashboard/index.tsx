"use client";

import DashboardContextProvider from "@/components/features/dashboard/context";
import DashboardHeader from "@/components/features/dashboard/components/header";
import CreditCardDebts from "@/components/features/dashboard/components/credit-card-debts";
import CategoryPieChart from "@/components/features/dashboard/components/category-pie-chart";
import SourcePieChart from "@/components/features/dashboard/components/source-pie-chart";
import DailyBarChart from "@/components/features/dashboard/components/daily-bar-chart";

export default function DashboardComponent() {
    return (
        <DashboardContextProvider>
            <div className="flex flex-col gap-4">
                <DashboardHeader />
                <div className="flex flex-col gap-4">
                    <CreditCardDebts />
                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                        <CategoryPieChart />
                        <SourcePieChart />
                    </div>
                    <DailyBarChart />
                </div>
            </div>
        </DashboardContextProvider>
    );
}
