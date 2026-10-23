"use client";

import { Button, Card, Empty, Space, Spin } from "antd";
import { Pencil, Trash2 } from "lucide-react";
import BudgetProgress from "@/components/common/budget-progress";
import { useBudgetsContext } from "@/components/features/budgets/context";

export default function BudgetList() {
    const { items, isLoading, monthValue, openEditModal, handleDelete, openCreateModal } =
        useBudgetsContext();

    if (!isLoading && items.length === 0) {
        return (
            <Card>
                <Empty description="Chưa có ngân sách nào">
                    <Button type="primary" onClick={openCreateModal}>
                        Đặt ngân sách đầu tiên
                    </Button>
                </Empty>
            </Card>
        );
    }

    return (
        <Spin spinning={isLoading}>
            <p className="mb-2 text-xs text-muted-foreground">
                Đã chi trong tháng {monthValue.format("MM/YYYY")} (gồm phí chuyển tiền)
            </p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {items.map((item) => (
                    <Card key={item._id} size="small">
                        <BudgetProgress
                            budget={item}
                            actions={
                                <Space size={0} className="shrink-0">
                                    <Button
                                        type="text"
                                        size="small"
                                        aria-label="Sửa ngân sách"
                                        icon={<Pencil className="size-4" />}
                                        onClick={() => openEditModal(item)}
                                    />
                                    <Button
                                        type="text"
                                        size="small"
                                        danger
                                        aria-label="Xóa ngân sách"
                                        icon={<Trash2 className="size-4" />}
                                        onClick={() => handleDelete(item)}
                                    />
                                </Space>
                            }
                        />
                    </Card>
                ))}
            </div>
        </Spin>
    );
}
