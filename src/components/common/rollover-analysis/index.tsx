"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import dayjs from "dayjs";
import Combobox from "@/components/common/combobox";
import DebouncedNumberInput from "@/components/common/input/DebouncedNumberInput";
import Money from "@/components/common/money";
import RolloverProjectionChart from "@/components/common/rollover-projection-chart";
import { Alert, AlertDescription } from "@/components/shadcn/ui/alert";
import { MENU_KEY } from "@/libs/constants/menuKey";
import { useGetRolloverJourneys } from "@/libs/hooks/customHooks/useRolloverJourneys";
import type { ISourcesOfMoneyData } from "@/libs/interfaces/sourcesOfMoneyData";
import { cn } from "@/libs/shadcn/utils";
import { formatMoney } from "@/libs/utils/formatMoney";
import { getStatementCycle } from "@/libs/utils/statementCycle";
import {
    interestIfCarried,
    minPaymentToReduce,
    paymentToFinishIn,
    projectRollovers,
} from "@/libs/utils/rolloverProjection";

const toNumber = (value: unknown) => {
    if (value === undefined || value === null || value === "") return 0;
    const num = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
    return Number.isFinite(num) ? num : 0;
};

/** Giới hạn % ở 100 (ô số không còn `max`); giữ nguyên chuỗi đang gõ khi hợp lệ để không mất dấu thập phân. */
const clampPercent = (value: string | number | null): string | number =>
    toNumber(value) > 100 ? 100 : (value ?? 0);

type FeeMode = "add" | "cash";

const FEE_MODE_OPTIONS: { value: FeeMode; label: string }[] = [
    { value: "add", label: "Cộng vào nợ (quẹt lại gồm phí)" },
    { value: "cash", label: "Trả riêng bằng tiền mặt" },
];

/** Lãi trả góp giả định (%/tháng) để so sánh, người dùng sửa được. */
const DEFAULT_INSTALLMENT_RATE = 1.2;

function Tile({ label, value, sub, className }: { label: string; value: React.ReactNode; sub?: React.ReactNode; className?: string }) {
    return (
        <div className={cn("rounded-lg border border-border px-3 py-2", className)}>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="font-semibold">{value}</p>
            {sub ? <p className="text-xs text-muted-foreground">{sub}</p> : null}
        </div>
    );
}

interface IRolloverAnalysisProps {
    source: ISourcesOfMoneyData;
}

/**
 * Tab "Phân tích" của modal đáo hạn: tóm tắt hành trình thật (link sang trang Hành trình),
 * mô phỏng theo kỳ (hòa gốc, sạch nợ, phí sau 6/12/24 kỳ, biểu đồ, bảng) và so sánh phương án.
 */
export default function RolloverAnalysis({ source }: IRolloverAnalysisProps) {
    const details = source.creditDetails;
    const currentDebt = details?.currentDebt ?? 0;
    const cycle = getStatementCycle(details?.statementDate, dayjs());
    const cycleDays = Math.max(7, cycle.end.diff(cycle.start, "day"));

    const [debt, setDebt] = useState<string | number>(Math.round(currentDebt));
    const [feePercent, setFeePercent] = useState<string | number>(details?.rolloverFeePercent ?? 0);
    const [extra, setExtra] = useState<string | number>(0);
    const [feeMode, setFeeMode] = useState<FeeMode>("add");
    const [interestRate, setInterestRate] = useState<string | number>(details?.interestRate ?? 0);
    const [installmentRate, setInstallmentRate] = useState<string | number>(DEFAULT_INSTALLMENT_RATE);

    const { data: journeysData } = useGetRolloverJourneys(source._id);
    const journey = journeysData?.data?.[0] ?? null;

    const D = toNumber(debt);
    const r = toNumber(feePercent);
    const x = toNumber(extra);
    const I = toNumber(interestRate);
    const result = useMemo(
        () => projectRollovers({ debt: D, feePercent: r, extraPayment: x, feeAddedToDebt: feeMode === "add" }),
        [D, r, x, feeMode],
    );
    const rows = result.rows;
    const at = (k: number) => rows[Math.min(k, rows.length) - 1];
    const endPeriod = result.debtFreePeriod ?? result.breakEvenPeriod ?? rows.length;
    const dateOf = (k: number) => dayjs().add(k * cycleDays, "day").format("MM/YYYY");
    const faster = useMemo(
        () => [3, 6, 12].map((n) => ({ n, ...paymentToFinishIn(D, r, n, feeMode === "add") })),
        [D, r, feeMode],
    );
    const months = Math.max(1, Math.round((endPeriod * cycleDays) / 30));
    const compare = [
        { key: "rollover", title: "Đáo hạn liên tục", value: result.totalFee, sub: `${endPeriod} kỳ · nợ ${result.debtFreePeriod ? "về 0" : `còn ${formatMoney(rows.at(-1)?.debtAfter ?? D)}`}` },
        { key: "interest", title: "Trả tối thiểu, chịu lãi", value: I > 0 ? interestIfCarried(D, I, months * 30) : null, sub: I > 0 ? `${months} tháng, lãi ${I}%/năm, nợ giữ nguyên` : "Chưa nhập lãi suất thẻ" },
        { key: "installment", title: "Trả góp dư nợ", value: Math.round((D * toNumber(installmentRate) * months) / 100), sub: `${months} tháng, lãi ${toNumber(installmentRate)}%/tháng, hết nợ` },
    ];
    const bestValue = Math.min(...compare.map((c) => c.value ?? Infinity));

    const chartRows = rows.slice(0, 120);

    return (
        <div className="flex flex-col gap-4">
            <section>
                <p className="mb-1 text-sm font-semibold">Thực tế đã ghi</p>
                {journey ? (
                    <>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            <Tile label="Số tiền gốc" value={<Money value={journey.baseAmount} />} sub={`bắt đầu ${dayjs(journey.startedAt).format("DD/MM/YYYY")}`} />
                            <Tile label="Đã đáo" value={`${journey.stats.rolloverCount} lần`} sub={journey.endedAt ? "đã kết thúc" : "đang mở"} />
                            <Tile label="Tổng phí đã mất" value={<Money value={journey.stats.totalFee} kind="out" />} sub={journey.baseAmount > 0 ? `${((journey.stats.totalFee / journey.baseAmount) * 100).toFixed(1)}% gốc` : undefined} />
                            <Tile label="Tổng tự trả" value={<Money value={journey.stats.totalPaid} kind="in" />} />
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                            Xem dòng thời gian và dự báo đầy đủ ở{" "}
                            <Link href={`${MENU_KEY.ROLLOVER_JOURNEY}?cardId=${source._id}`} className="text-accent-text underline">
                                trang Hành trình đáo hạn
                            </Link>
                            .
                        </p>
                    </>
                ) : (
                    <p className="text-xs text-muted-foreground">Thẻ này chưa ghi lần đáo hạn nào, chỉ có mô phỏng bên dưới.</p>
                )}
            </section>

            <section>
                <p className="mb-2 text-sm font-semibold">Mô phỏng</p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-3">
                    <label className="text-xs">
                        Số tiền đáo (D)
                        <DebouncedNumberInput className="mt-1" min={0} precision={0} delay={300} value={debt} onChange={(v) => setDebt(v ?? 0)} />
                    </label>
                    <label className="text-xs">
                        % phí mỗi lần
                        <DebouncedNumberInput className="mt-1" min={0} delay={300} value={feePercent} onChange={(v) => setFeePercent(clampPercent(v))} />
                    </label>
                    <label className="text-xs">
                        Tự trả thêm mỗi kỳ (x)
                        <DebouncedNumberInput className="mt-1" min={0} precision={0} delay={300} value={extra} onChange={(v) => setExtra(v ?? 0)} />
                    </label>
                    <label className="text-xs">
                        Phí
                        <Combobox<FeeMode>
                            className="mt-1"
                            value={feeMode}
                            onChange={(next) => {
                                if (next) setFeeMode(next);
                            }}
                            options={FEE_MODE_OPTIONS}
                        />
                    </label>
                    <label className="text-xs">
                        Lãi thẻ (%/năm, để so sánh)
                        <DebouncedNumberInput className="mt-1" min={0} delay={300} value={interestRate} onChange={(v) => setInterestRate(clampPercent(v))} />
                    </label>
                    <label className="text-xs">
                        Lãi trả góp (%/tháng, giả định)
                        <DebouncedNumberInput className="mt-1" min={0} delay={300} value={installmentRate} onChange={(v) => setInstallmentRate(clampPercent(v))} />
                    </label>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Chu kỳ = {cycleDays} ngày theo ngày sao kê của thẻ.</p>

                {D <= 0 || r <= 0 ? (
                    <Alert className="mt-3">
                        <AlertDescription>{D <= 0 ? "Nhập số tiền đáo để mô phỏng." : "Phí 0% nên không có điểm hòa gốc."}</AlertDescription>
                    </Alert>
                ) : (
                    <>
                        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                            <Tile label="Hòa gốc (phí tích lũy = D)" value={result.breakEvenPeriod ? `lần ${result.breakEvenPeriod} · ${dateOf(result.breakEvenPeriod)}` : "Không chạm"} sub={result.breakEvenPeriod ? undefined : "nợ về 0 trước"} className={result.breakEvenPeriod ? "text-debt" : "text-money-in"} />
                            <Tile label="Sạch nợ nhờ tự trả x" value={result.debtFreePeriod ? `kỳ ${result.debtFreePeriod} · ${dateOf(result.debtFreePeriod)}` : "Không bao giờ"} sub={result.debtFreePeriod ? undefined : "x ≤ phí mỗi kỳ"} className={result.debtFreePeriod ? "text-money-in" : "text-debt"} />
                            <Tile label="Tổng phí đến lúc đó" value={<Money value={result.totalFee} kind="out" />} sub={`${((result.totalFee / D) * 100).toFixed(0)}% gốc`} />
                            <Tile label="Phí sau 6 kỳ" value={<Money value={at(6)?.cumulativeFee ?? result.totalFee} kind="out" />} />
                            <Tile label="Phí sau 12 kỳ" value={<Money value={at(12)?.cumulativeFee ?? result.totalFee} kind="out" />} />
                            <Tile label="Phí sau 24 kỳ" value={<Money value={at(24)?.cumulativeFee ?? result.totalFee} kind="out" />} />
                        </div>
                        <Alert className={cn("mt-3", x > result.firstFee ? "border-money-in text-money-in" : "border-debt text-debt")}>
                            <AlertDescription className="text-inherit">
                                {x > result.firstFee
                                    ? `Mỗi kỳ nợ giảm ≈${formatMoney(x - result.firstFee)}. Muốn sạch nợ trong 6 kỳ cần trả khoảng ${formatMoney(faster[1].payment)}/kỳ.`
                                    : `Mỗi kỳ bạn trả ${formatMoney(x)} nhưng phí đã ${formatMoney(result.firstFee)}: nợ không giảm. Cần trả tối thiểu ${formatMoney(minPaymentToReduce(D, r))}/kỳ để bắt đầu giảm nợ.`}
                            </AlertDescription>
                        </Alert>

                        <div className="mt-3 rounded-lg border border-border p-3">
                            <p className="mb-1 text-xs font-semibold">Phí tích lũy so với số tiền gốc</p>
                            <RolloverProjectionChart
                                series={[
                                    { key: "debt", label: "Dư nợ", color: "var(--debt)", points: [{ x: 0, y: D }, ...chartRows.map((row) => ({ x: row.period, y: row.debtAfter }))] },
                                    { key: "fee", label: "Phí tích lũy", color: "var(--money-out)", points: [{ x: 0, y: 0 }, ...chartRows.map((row) => ({ x: row.period, y: row.cumulativeFee }))] },
                                ]}
                                baseline={{ value: D, label: `Gốc ${formatMoney(D)}` }}
                                markers={result.breakEvenPeriod && result.breakEvenPeriod <= chartRows.length ? [{ x: result.breakEvenPeriod, y: at(result.breakEvenPeriod).cumulativeFee, label: `lần ${result.breakEvenPeriod}`, color: "var(--money-out)" }] : []}
                                xLabels={[{ x: 0, label: "kỳ 0" }, { x: chartRows.length, label: `kỳ ${chartRows.length}` }]}
                            />
                        </div>

                        <details className="mt-3">
                            <summary className="cursor-pointer text-xs font-semibold">Bảng theo kỳ</summary>
                            <div className="mt-1 max-h-64 overflow-auto rounded-lg border border-border">
                                <table className="w-full text-xs">
                                    <thead className="sticky top-0 bg-card text-muted-foreground">
                                        <tr><th className="px-2 py-1 text-left">Kỳ</th><th className="px-2 py-1 text-right">Bạn trả</th><th className="px-2 py-1 text-right">Phí</th><th className="px-2 py-1 text-right">Nợ sau kỳ</th><th className="px-2 py-1 text-right">Phí tích lũy</th><th className="px-2 py-1 text-right">% gốc</th></tr>
                                    </thead>
                                    <tbody className="tabular-nums">
                                        {rows.map((row) => (
                                            <tr key={row.period} className={cn("border-t border-border", row.period === result.breakEvenPeriod && "bg-warn-soft", row.debtAfter === 0 && "bg-money-in-soft")}>
                                                <td className="px-2 py-1">{row.period} · {dateOf(row.period)}</td>
                                                <td className="px-2 py-1 text-right">{formatMoney(row.paid)}</td>
                                                <td className="px-2 py-1 text-right text-money-out">{formatMoney(row.fee)}</td>
                                                <td className="px-2 py-1 text-right text-debt">{formatMoney(row.debtAfter)}</td>
                                                <td className="px-2 py-1 text-right">{formatMoney(row.cumulativeFee)}</td>
                                                <td className="px-2 py-1 text-right">{((row.cumulativeFee / D) * 100).toFixed(1)}%</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </details>

                        <p className="mt-4 mb-1 text-sm font-semibold">Để sạch nợ sớm hơn</p>
                        <table className="w-full text-xs tabular-nums">
                            <tbody>
                                {faster.map((item) => (
                                    <tr key={item.n} className="border-t border-border">
                                        <td className="py-1">Sạch nợ trong <b>{item.n} kỳ</b> ({dateOf(item.n)})</td>
                                        <td className="py-1 text-right">trả <b>{formatMoney(item.payment)}</b>/kỳ</td>
                                        <td className="py-1 text-right text-money-out">phí thêm {formatMoney(item.totalFee)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <p className="mt-4 mb-1 text-sm font-semibold">So sánh phương án trong cùng thời gian</p>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                            {compare.map((c) => (
                                <Tile key={c.key} label={c.title} value={c.value != null ? <Money value={c.value} kind="out" /> : "—"} sub={c.sub} className={c.value != null && c.value === bestValue ? "border-money-in bg-money-in-soft" : undefined} />
                            ))}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">Phương án rẻ nhất tô xanh. Đáo hạn còn kèm rủi ro bị khóa thẻ, không tính thành tiền ở đây.</p>
                    </>
                )}
            </section>
        </div>
    );
}
