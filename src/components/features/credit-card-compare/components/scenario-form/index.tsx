"use client";

import { RotateCcw } from "lucide-react";
import DebouncedNumberInput from "@/components/common/input/DebouncedNumberInput";
import { Button } from "@/components/shadcn/ui/button";
import { useCreditCardCompareContext } from "@/components/features/credit-card-compare/context";
import type { ICompareScenario } from "@/components/features/credit-card-compare/utils";

/** `money`: ô số tiền (có "₫"); còn lại là số đếm. Mọi giá trị đều là số nguyên. */
const FIELDS: { key: keyof ICompareScenario; label: string; money?: boolean }[] = [
    { key: "monthlySpend", label: "Chi tiêu mỗi tháng", money: true },
    { key: "monthlyTransactions", label: "Số giao dịch mỗi tháng" },
    { key: "paymentsPerCycle", label: "Số lần trả nợ mỗi kỳ" },
    { key: "carriedDebt", label: "Dư nợ chưa trả hết", money: true },
    { key: "cashAdvanceAmount", label: "Một lần rút tiền mặt", money: true },
    { key: "foreignAmount", label: "Một lần chi tiêu nước ngoài", money: true },
];

/** Cách dùng thẻ giả định; mọi số liệu so sánh được tính theo đây. */
export default function ScenarioForm() {
    const { scenario, handleScenarioChange, handleResetScenario } =
        useCreditCardCompareContext();

    return (
        <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                    <h2 className="text-base font-semibold">Cách bạn dùng thẻ</h2>
                    <p className="text-xs text-muted-foreground">
                        Phí được quy ra số tiền theo các con số này; giữ lại cho lần sau.
                    </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={handleResetScenario}>
                    <RotateCcw data-icon="inline-start" />
                    Mặc định
                </Button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {FIELDS.map((field) => (
                    <label key={field.key} className="flex flex-col gap-1 text-sm">
                        <span className="text-muted-foreground">{field.label}</span>
                        <DebouncedNumberInput
                            min={0}
                            precision={0}
                            suffix={field.money ? "₫" : undefined}
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
