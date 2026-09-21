"use client";

import DashboardContextProvider from "@/components/features/dashboard/context";
import DashboardHeader from "@/components/features/dashboard/components/header";
import CategoryPieChart from "@/components/features/dashboard/components/category-pie-chart";
import DailyBarChart from "@/components/features/dashboard/components/daily-bar-chart";

export default function DashboardComponent() {
    return (
        <DashboardContextProvider>
            <div className="flex flex-col gap-4">
                <DashboardHeader />
                <div className="flex flex-col gap-4">
                    <CategoryPieChart />
                    <DailyBarChart />
                </div>
            </div>
        </DashboardContextProvider>
    );
}
