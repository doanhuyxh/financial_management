import { Progress } from "antd";
import { BUDGET_WARNING_RATIO, type IBudgetData } from "@/libs/interfaces/budgetsData";
import { formatMoney, formatPercent } from "@/libs/utils/formatMoney";
import { cn } from "@/libs/shadcn/utils";

type BudgetStatus = "ok" | "warning" | "over";

export function getBudgetStatus(ratio: number): BudgetStatus {
    if (ratio > 1) return "over";
    if (ratio >= BUDGET_WARNING_RATIO) return "warning";
    return "ok";
}

const STATUS_COLORS: Record<BudgetStatus, string> = {
    ok: "#22c55e",
    warning: "#f59e0b",
    over: "#ef4444",
};

interface IBudgetProgressProps {
    budget: IBudgetData;
    /** Thao tác (sửa/xóa) hiển thị bên phải tên */
    actions?: React.ReactNode;
}

export default function BudgetProgress({ budget, actions }: IBudgetProgressProps) {
    const status = getBudgetStatus(budget.ratio);

    return (
        <div className="flex flex-col gap-1">
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className={cn("truncate font-medium", budget.categoryId === null && "font-semibold")}>
                        {budget.categoryName}
                    </p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                        {formatMoney(budget.spent)} / {formatMoney(budget.amount)}
                    </p>
                </div>
                {actions}
            </div>
            <Progress
                percent={Math.min(100, budget.ratio * 100)}
                showInfo={false}
                strokeColor={STATUS_COLORS[status]}
                size="small"
            />
            <p
                className={cn(
                    "text-xs tabular-nums",
                    status === "over"
                        ? "text-red-500"
                        : status === "warning"
                          ? "text-amber-500"
                          : "text-muted-foreground",
                )}
            >
                {status === "over"
                    ? `Vượt ${formatMoney(-budget.remaining)} (${formatPercent(budget.ratio)})`
                    : `Còn ${formatMoney(budget.remaining)} · đã dùng ${formatPercent(budget.ratio)}`}
            </p>
        </div>
    );
}
