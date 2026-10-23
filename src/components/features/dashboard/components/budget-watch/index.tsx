"use client";

import { useMemo } from "react";
import { Button, Empty, Spin } from "antd";
import { ChevronRight } from "lucide-react";
import BudgetProgress from "@/components/common/budget-progress";
import { useDashboardContext } from "@/components/features/dashboard/context";
import { BUDGET_WARNING_RATIO } from "@/libs/interfaces/budgetsData";

/** Số ngân sách danh mục tối đa hiển thị trên dashboard. */
const MAX_ITEMS = 5;

export default function BudgetWatch() {
    const { budgets, isBudgetsLoading, monthValue, handleOpenBudgets } = useDashboardContext();

    const { totalBudget, flagged, okCount } = useMemo(() => {
        const categoryBudgets = budgets.filter((item) => item.categoryId !== null);
        const atRisk = categoryBudgets
            .filter((item) => item.ratio >= BUDGET_WARNING_RATIO)
            .sort((a, b) => b.ratio - a.ratio);
        return {
            totalBudget: budgets.find((item) => item.categoryId === null) ?? null,
            flagged: atRisk.slice(0, MAX_ITEMS),
            okCount: categoryBudgets.length - atRisk.length,
        };
    }, [budgets]);

    return (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-background p-4">
            <div className="flex items-start justify-between gap-2">
                <div>
                    <h2 className="text-base font-semibold">Ngân sách</h2>
                    <p className="text-xs text-muted-foreground">
                        Tháng {monthValue.format("MM/YYYY")} · danh mục sắp hoặc đã vượt
                    </p>
                </div>
                <Button
                    type="link"
                    size="small"
                    className="px-0!"
                    onClick={handleOpenBudgets}
                >
                    {budgets.length ? "Xem tất cả" : "Đặt ngân sách"}
                    <ChevronRight className="size-4" />
                </Button>
            </div>

            {isBudgetsLoading ? (
                <div className="flex h-24 items-center justify-center">
                    <Spin />
                </div>
            ) : budgets.length === 0 ? (
                <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="Chưa đặt ngân sách. Đặt hạn mức để được cảnh báo khi sắp chi quá tay."
                />
            ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {totalBudget ? <BudgetProgress budget={totalBudget} /> : null}
                    {flagged.map((item) => (
                        <BudgetProgress key={item._id} budget={item} />
                    ))}
                    {flagged.length === 0 && okCount > 0 ? (
                        <p className="self-center text-sm text-muted-foreground">
                            {okCount} ngân sách danh mục đều còn trong giới hạn
                        </p>
                    ) : null}
                </div>
            )}
        </div>
    );
}
