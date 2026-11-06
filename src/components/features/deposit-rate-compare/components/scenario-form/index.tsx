"use client";

import ChoiceChips from "@/components/common/choice-chips";
import { Input } from "@/components/shadcn/ui/input";
import { useDepositRateCompareContext } from "@/components/features/deposit-rate-compare/context";
import { DEPOSIT_TERMS } from "@/libs/interfaces/depositRatesData";

const AMOUNT_PRESETS = [50_000_000, 100_000_000, 200_000_000, 500_000_000, 1_000_000_000];
const MAX_AMOUNT = 1_000_000_000_000;
const numberFormatter = new Intl.NumberFormat("vi-VN");

function formatPreset(value: number) {
    return value >= 1_000_000_000 ? `${value / 1_000_000_000} tỷ` : `${value / 1_000_000} triệu`;
}

/** Số tiền gửi + kỳ hạn; lưu localStorage cho lần sau. */
export default function ScenarioForm() {
    const { scenario, availableTerms, handleScenarioChange } = useDepositRateCompareContext();
    const termOptions = DEPOSIT_TERMS.map((term) => ({
        value: String(term),
        label: `${term} tháng`,
        hint: availableTerms.includes(term) ? undefined : "—",
    }));

    return (
        <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
            <div>
                <h2 className="text-base font-semibold">Bạn định gửi</h2>
                <p className="text-xs text-muted-foreground">
                    Tiền lãi tính lãi đơn, nhận cuối kỳ, không tái tục.
                </p>
            </div>
            <label className="flex flex-col gap-1 text-sm">
                <span className="text-muted-foreground">Số tiền gửi (VND)</span>
                <Input
                    inputMode="numeric"
                    className="money-value h-11 text-lg font-semibold tabular-nums"
                    value={scenario.amount ? numberFormatter.format(scenario.amount) : ""}
                    placeholder="100.000.000"
                    onChange={(event) => {
                        const digits = event.target.value.replace(/\D/g, "");
                        handleScenarioChange({ amount: Math.min(Number(digits) || 0, MAX_AMOUNT) });
                    }}
                />
            </label>
            <ChoiceChips
                label="Nhanh:"
                options={AMOUNT_PRESETS.map((value) => ({ value: String(value), label: formatPreset(value) }))}
                value={String(scenario.amount)}
                onChange={(value) => handleScenarioChange({ amount: Number(value) })}
            />
            <ChoiceChips
                label="Kỳ hạn:"
                options={termOptions}
                value={String(scenario.termMonths)}
                onChange={(value) => handleScenarioChange({ termMonths: Number(value) })}
            />
        </section>
    );
}
