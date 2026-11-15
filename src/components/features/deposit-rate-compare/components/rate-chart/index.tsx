"use client";

import { useMemo } from "react";
import { useDepositRateCompareContext } from "@/components/features/deposit-rate-compare/context";
import { formatRate } from "@/components/features/deposit-rate-compare/utils";
import { getCategoryColor } from "@/libs/utils/categoryColor";
import { cn } from "@/libs/shadcn/utils";

const WIDTH = 1000;
const HEIGHT = 260;
const PAD = { left: 44, right: 24, top: 14, bottom: 14 };

/**
 * Lãi suất theo kỳ hạn: mỗi lựa chọn gửi một đường, trục ngang là kỳ hạn.
 * Cho thấy chỗ lãi suất nhảy bậc (gửi dài thêm có đáng không). Bấm nhãn kỳ hạn để chọn.
 */
export default function RateChart() {
    const { options, availableTerms, scenario, handleScenarioChange } = useDepositRateCompareContext();

    const chart = useMemo(() => {
        const values = options.flatMap((option) =>
            availableTerms.flatMap((term) => (option.rates.has(term) ? [option.rates.get(term)!] : [])),
        );
        if (availableTerms.length < 2 || values.length === 0) return null;
        const low = Math.floor(Math.min(...values));
        const high = Math.max(low + 1, Math.ceil(Math.max(...values)));
        const step = high - low > 8 ? 2 : 1;
        const x = (index: number) =>
            PAD.left + ((WIDTH - PAD.left - PAD.right) * index) / (availableTerms.length - 1);
        const y = (value: number) =>
            PAD.top + (HEIGHT - PAD.top - PAD.bottom) * (1 - (value - low) / (high - low));
        const ticks: number[] = [];
        for (let value = low; value <= high; value += step) ticks.push(value);
        // Hai lựa chọn cùng tên ngân hàng (VD tự nhập + tự lấy) thì thêm tên sản phẩm cho dễ phân biệt
        const nameCount = new Map<string, number>();
        options.forEach((option) => nameCount.set(option.bankName, (nameCount.get(option.bankName) ?? 0) + 1));
        const lines = options.map((option) => ({
            option,
            label:
                (nameCount.get(option.bankName) ?? 0) > 1 && option.product
                    ? `${option.bankName} · ${option.product}`
                    : option.bankName,
            color: getCategoryColor(option.id),
            points: availableTerms.flatMap((term, index) =>
                option.rates.has(term) ? [{ term, rate: option.rates.get(term)!, x: x(index), y: y(option.rates.get(term)!) }] : [],
            ),
        }));
        return { x, y, ticks, lines };
    }, [options, availableTerms]);

    if (!chart) return null;

    const selectedIndex = availableTerms.indexOf(scenario.termMonths);

    return (
        <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
            <div>
                <h2 className="text-base font-semibold">Lãi suất theo kỳ hạn</h2>
                <p className="text-xs text-muted-foreground">
                    Đường dốc lên là chỗ gửi dài thêm được lãi cao hơn · bấm một kỳ hạn để chọn · đường nối qua kỳ
                    hạn ngân hàng không có
                </p>
            </div>
            <div className="overflow-x-auto pb-1">
                <div className="relative min-w-160">
                    <svg
                        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                        className="block w-full"
                        role="img"
                        aria-label="Lãi suất theo kỳ hạn của các ngân hàng"
                    >
                        {chart.ticks.map((value) => (
                            <g key={value}>
                                <line
                                    x1={PAD.left}
                                    x2={WIDTH - PAD.right}
                                    y1={chart.y(value)}
                                    y2={chart.y(value)}
                                    className="stroke-border"
                                />
                                <text
                                    x={PAD.left - 8}
                                    y={chart.y(value) + 4}
                                    textAnchor="end"
                                    className="fill-muted-foreground text-[11px]"
                                >
                                    {value}%
                                </text>
                            </g>
                        ))}
                        {selectedIndex >= 0 ? (
                            <rect
                                x={chart.x(selectedIndex) - 22}
                                y={PAD.top}
                                width={44}
                                height={HEIGHT - PAD.top - PAD.bottom}
                                rx={6}
                                className="fill-primary/10"
                            />
                        ) : null}
                        {chart.lines.map((line) => (
                            <g key={line.option.id}>
                                <polyline
                                    fill="none"
                                    stroke={line.color}
                                    strokeWidth={2.2}
                                    strokeLinejoin="round"
                                    points={line.points.map((point) => `${point.x},${point.y}`).join(" ")}
                                />
                                {line.points.map((point) => (
                                    <circle
                                        key={point.term}
                                        cx={point.x}
                                        cy={point.y}
                                        r={point.term === scenario.termMonths ? 5 : 3.5}
                                        fill={line.color}
                                        className="stroke-card"
                                        strokeWidth={1.5}
                                    >
                                        <title>{`${line.label} · ${point.term} tháng: ${formatRate(point.rate)}`}</title>
                                    </circle>
                                ))}
                            </g>
                        ))}
                    </svg>
                    <div className="relative h-6">
                        {availableTerms.map((term, index) => (
                            <button
                                key={term}
                                type="button"
                                onClick={() => handleScenarioChange({ termMonths: term })}
                                className={cn(
                                    "absolute top-0 -translate-x-1/2 rounded px-1.5 py-0.5 text-xs tabular-nums hover:text-foreground",
                                    term === scenario.termMonths
                                        ? "font-semibold text-accent-text"
                                        : "text-muted-foreground",
                                )}
                                style={{ left: `${(chart.x(index) / WIDTH) * 100}%` }}
                            >
                                {term}T
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {chart.lines.map((line) => (
                    <li key={line.option.id} className="flex items-center gap-1.5">
                        <span className="h-0.5 w-3.5 rounded-full" style={{ backgroundColor: line.color }} />
                        {line.label}
                    </li>
                ))}
            </ul>
        </section>
    );
}
