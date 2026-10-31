"use client";

import { Button } from "antd";
import { RotateCcw } from "lucide-react";
import DebouncedNumberInput from "@/components/common/input/DebouncedNumberInput";
import { useCreditCardCompareContext } from "@/components/features/credit-card-compare/context";
import type { ICompareScenario } from "@/components/features/credit-card-compare/utils";

const FIELDS: { key: keyof ICompareScenario; label: string; step: number }[] = [
    { key: "monthlySpend", label: "Chi tiêu mỗi tháng", step: 500_000 },
    { key: "monthlyTransactions", label: "Số giao dịch mỗi tháng", step: 1 },
    { key: "paymentsPerCycle", label: "Số lần trả nợ mỗi kỳ", step: 1 },
    { key: "carriedDebt", label: "Dư nợ chưa trả hết", step: 500_000 },
    { key: "cashAdvanceAmount", label: "Một lần rút tiền mặt", step: 500_000 },
    { key: "foreignAmount", label: "Một lần chi tiêu nước ngoài", step: 500_000 },
];

/** Cách dùng thẻ giả định; mọi số liệu so sánh được tính theo đây. */
export default function ScenarioForm() {
    const { scenario, handleScenarioChange, handleResetScenario } =
        useCreditCardCompareContext();

    return (
        <div className="rounded-xl border border-border bg-background p-4">
            <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                    <h2 className="text-base font-semibold">Cách bạn dùng thẻ</h2>
                    <p className="text-xs text-muted-foreground">
                        Phí được quy ra số tiền theo các con số này; giữ lại cho lần sau.
                    </p>
                </div>
                <Button
                    size="small"
                    icon={<RotateCcw className="size-3.5" />}
                    onClick={handleResetScenario}
                >
                    Mặc định
                </Button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {FIELDS.map((field) => (
                    <label key={field.key} className="flex flex-col gap-1 text-sm">
                        <span className="text-muted-foreground">{field.label}</span>
                        <DebouncedNumberInput
                            className="w-full!"
                            min={0}
                            step={field.step}
                            value={scenario[field.key]}
                            onChange={(value) =>
                                handleScenarioChange({ [field.key]: Number(value) || 0 })
                            }
                        />
                    </label>
                ))}
            </div>
        </div>
    );
}
