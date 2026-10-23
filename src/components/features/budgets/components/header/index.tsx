"use client";

import { Button, DatePicker } from "antd";
import { Plus } from "lucide-react";
import { useBudgetsContext } from "@/components/features/budgets/context";

export default function BudgetsHeader() {
    const { monthValue, categoryOptions, handleChangeMonth, openCreateModal } =
        useBudgetsContext();

    return (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <h1 className="text-lg font-semibold">Ngân sách</h1>
                <p className="text-xs text-muted-foreground">
                    Hạn mức chi tiêu mỗi tháng, áp dụng cho mọi tháng
                </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <DatePicker
                    inputReadOnly
                    picker="month"
                    value={monthValue}
                    onChange={handleChangeMonth}
                    format="MM/YYYY"
                    allowClear={false}
                    className="w-full sm:w-32"
                />
                <Button
                    type="primary"
                    className="w-full sm:w-auto"
                    icon={<Plus className="size-4" />}
                    disabled={categoryOptions.length === 0}
                    onClick={openCreateModal}
                >
                    Thêm ngân sách
                </Button>
            </div>
        </div>
    );
}
