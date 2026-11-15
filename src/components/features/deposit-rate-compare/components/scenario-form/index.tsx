"use client";

import ChoiceChips from "@/components/common/choice-chips";
import Segmented from "@/components/common/segmented";
import { Input } from "@/components/shadcn/ui/input";
import { useDepositRateCompareContext } from "@/components/features/deposit-rate-compare/context";
import { DEPOSIT_TERMS } from "@/libs/interfaces/depositRatesData";

const AMOUNT_PRESETS = [50_000_000, 100_000_000, 200_000_000, 500_000_000, 1_000_000_000];
const MAX_AMOUNT = 1_000_000_000_000;
const numberFormatter = new Intl.NumberFormat("vi-VN");

function formatPreset(value: number) {
    return value >= 1_000_000_000 ? `${value / 1_000_000_000} tỷ` : `${value / 1_000_000} triệu`;
}

/** Số tiền gửi + kỳ hạn (lưu localStorage cho lần sau). Kỳ hạn chưa ngân hàng nào có thì không chọn được. */
export default function ScenarioForm() {
    const { scenario, availableTerms, handleScenarioChange } = useDepositRateCompareContext();

    return (
        <div className="grid gap-4 md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] md:items-start">
            <div className="flex flex-col gap-2">
                <label className="flex flex-col gap-1 text-sm">
                    <span className="text-xs text-muted-foreground">Số tiền gửi (VND)</span>
                    <Input
                        inputMode="numeric"
                        className="money-value h-11 border-primary/50 text-xl font-semibold tabular-nums"
                        value={scenario.amount ? numberFormatter.format(scenario.amount) : ""}
                        placeholder="100.000.000"
                        onChange={(event) => {
                            const digits = event.target.value.replace(/\D/g, "");
                            handleScenarioChange({ amount: Math.min(Number(digits) || 0, MAX_AMOUNT) });
                        }}
                    />
                </label>
                <ChoiceChips
                    options={AMOUNT_PRESETS.map((value) => ({ value: String(value), label: formatPreset(value) }))}
                    value={String(scenario.amount)}
                    onChange={(value) => handleScenarioChange({ amount: Number(value) })}
                />
            </div>
            <div className="flex min-w-0 flex-col gap-1">
                <span className="text-xs text-muted-foreground">Kỳ hạn</span>
                <div className="no-scrollbar -mx-1 overflow-x-auto px-1">
                    <Segmented
                        variant="primary"
                        aria-label="Kỳ hạn gửi"
                        value={String(scenario.termMonths)}
                        onChange={(value) => handleScenarioChange({ termMonths: Number(value) })}
                        options={DEPOSIT_TERMS.map((term) => ({
                            value: String(term),
                            label: `${term}T`,
                            disabled: !availableTerms.includes(term),
                        }))}
                    />
                </div>
                <p className="text-xs text-muted-foreground">
                    Tiền lãi tính lãi đơn, nhận cuối kỳ, không tái tục, chưa trừ thuế.
                </p>
            </div>
        </div>
    );
}
