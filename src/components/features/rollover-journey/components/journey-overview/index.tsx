"use client";

import dayjs from "dayjs";
import { Pencil } from "lucide-react";
import Money from "@/components/common/money";
import RolloverProjectionChart from "@/components/common/rollover-projection-chart";
import { Button } from "@/components/shadcn/ui/button";
import { useRolloverJourneyContext } from "@/components/features/rollover-journey/context";
import { FEE_MILESTONES } from "@/components/features/rollover-journey/utils";
import { cn } from "@/libs/shadcn/utils";
import { formatMoney } from "@/libs/utils/formatMoney";

function Tile({ label, value, sub, className }: { label: string; value: React.ReactNode; sub?: React.ReactNode; className?: string }) {
    return (
        <div className={cn("rounded-lg border border-border px-3 py-2", className)}>
            <p className="text-xs text-muted-foreground">{label}</p>
            <div className="text-lg font-bold">{value}</div>
            {sub ? <p className="text-xs text-muted-foreground">{sub}</p> : null}
        </div>
    );
}

/** 5 ô số, hai thanh tiến độ, dòng dự báo và biểu đồ dư nợ / phí / tự trả. */
export default function JourneyOverview() {
    const { computed, selectedJourney, view, openBaseModal } = useRolloverJourneyContext();
    if (!computed || !selectedJourney) return null;
    const c = computed;
    const pct = (value: number) => `${Math.round(value * 100)}%`;
    const debtRatio = c.base > 0 ? Math.min(1, c.debtNow / c.base) : 0;
    const showProjected = view === "all" && c.projectedPoints.length > 0;
    const lastReal = c.realPoints[c.realPoints.length - 1];
    const projectedWithJoin = showProjected ? [lastReal, ...c.projectedPoints] : [];
    const toPoints = (points: typeof c.realPoints, key: "debt" | "cumFee" | "cumPaid") =>
        points.map((point) => ({ x: point.period, y: point[key] }));
    const lastPeriod = showProjected ? c.projectedPoints[c.projectedPoints.length - 1].period : lastReal.period;

    return (
        <section className="rounded-xl border border-border bg-card p-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                <Tile
                    label="Gốc ban đầu"
                    value={
                        <span className="flex items-center gap-1">
                            <Money value={c.base} />
                            <Button type="button" variant="ghost" size="icon-xs" aria-label="Sửa số tiền gốc" onClick={openBaseModal}>
                                <Pencil />
                            </Button>
                        </span>
                    }
                    sub={`lần đáo đầu ${dayjs(selectedJourney.startedAt).format("DD/MM/YYYY")}`}
                />
                <Tile label="Nợ hiện tại" value={<Money value={c.debtNow} kind="debt" />} sub={c.base - c.debtNow > 0 ? <span className="text-money-in">đã giảm {formatMoney(c.base - c.debtNow)}</span> : c.base - c.debtNow < 0 ? <span className="text-debt">đã tăng {formatMoney(c.debtNow - c.base)}</span> : "bằng gốc"} />
                <Tile label="Tổng phí đã mất" value={<Money value={c.totalFee} kind="out" />} sub={`${(c.feeRatio * 100).toFixed(1)}% gốc · ${c.count} lần`} />
                <Tile label="Tổng bạn đã tự trả" value={<Money value={c.totalPaid} kind="in" />} sub={c.totalPaid + c.totalFee > 0 ? `${Math.round((c.totalPaid / (c.totalPaid + c.totalFee)) * 100)}% vào gốc, còn lại là phí` : undefined} />
                <Tile
                    label={c.isOpen ? "Dự kiến sạch nợ" : "Kết thúc"}
                    value={
                        c.isOpen
                            ? c.debtFreeDate
                                ? <span className="text-money-in">{c.debtFreeDate.format("MM/YYYY")}</span>
                                : c.debtNow <= 0 ? <span className="text-money-in">Đã sạch</span> : <span className="text-debt">Không</span>
                            : dayjs(selectedJourney.endedAt).format("DD/MM/YYYY")
                    }
                    sub={
                        c.isOpen
                            ? c.projection?.debtFreePeriod
                                ? `còn ${c.projection.debtFreePeriod} kỳ nếu trả ${formatMoney(c.avgPayment)}/kỳ`
                                : c.debtNow > 0 ? "x ≤ phí, nợ không giảm" : undefined
                            : undefined
                    }
                />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <div>
                    <div className="flex justify-between text-xs"><span className="font-semibold">Nợ còn lại so với gốc</span><span className="tabular-nums">{formatMoney(c.debtNow)} / {formatMoney(c.base)} ({pct(c.base > 0 ? c.debtNow / c.base : 0)})</span></div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted"><i className="block h-full bg-debt" style={{ width: `${debtRatio * 100}%` }} /></div>
                    <div className="mt-3 flex justify-between text-xs"><span className="font-semibold">Phí tích lũy so với gốc</span><span className="tabular-nums text-warn">{formatMoney(c.totalFee)} / {formatMoney(c.base)} ({(c.feeRatio * 100).toFixed(1)}%)</span></div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted"><i className="block h-full bg-warn" style={{ width: `${Math.min(100, c.feeRatio * 100)}%` }} /></div>
                    <div className="mt-0.5 flex justify-between text-[11px] text-muted-foreground">
                        <span>0%</span>
                        {FEE_MILESTONES.map((mark) => (
                            <span key={mark} className={c.feeRatio >= mark ? "text-debt" : undefined}>{Math.round(mark * 100)}%{mark === 0.5 ? " ⚠" : mark === 1 ? " = hòa gốc" : ""}</span>
                        ))}
                    </div>
                    {c.isOpen ? (
                        <p className="mt-3 rounded-r-md border-l-2 border-primary bg-primary-soft px-3 py-2 text-xs">
                            {c.projection?.debtFreePeriod ? (
                                <>Giữ nhịp trả <b>{formatMoney(c.avgPayment)}/kỳ</b>: sạch nợ sau <b>{c.projection.debtFreePeriod} kỳ</b> ({c.debtFreeDate?.format("MM/YYYY")}), tổng phí cả hành trình ≈ <b className="text-money-out">{formatMoney(c.projection.totalFee)}</b> ({Math.round((c.projection.totalFee / c.base) * 100)}% gốc){c.remainingToBreakEven && c.remainingToBreakEven <= c.projection.debtFreePeriod ? `, hòa gốc sau ${c.remainingToBreakEven} lần nữa` : ", không chạm mốc hòa gốc"}.</>
                            ) : c.debtNow > 0 && c.feePercent > 0 ? (
                                <>Với nhịp hiện tại ({formatMoney(c.avgPayment)}/kỳ) nợ không giảm. Cần tự trả ít nhất <b>{formatMoney(c.minPayment)}/kỳ</b>{c.remainingToBreakEven ? `; nếu không, phí bằng gốc sau ${c.remainingToBreakEven} lần nữa` : ""}.</>
                            ) : c.debtNow > 0 ? (
                                <>Thẻ chưa có % phí đáo hạn nên chưa dự báo được. Nhập % trong cấu hình thẻ hoặc ghi một lần đáo có phí.</>
                            ) : (
                                <>Dư nợ đã về 0. Hành trình sẽ tự đóng khi tải lại.</>
                            )}
                        </p>
                    ) : null}
                </div>
                <div className="rounded-lg border border-border p-3">
                    <p className="mb-1 text-xs font-semibold">Dư nợ & phí theo thời gian</p>
                    <RolloverProjectionChart
                        series={[
                            { key: "debt", label: "Dư nợ", color: "var(--debt)", points: toPoints(c.realPoints, "debt") },
                            { key: "fee", label: "Phí tích lũy", color: "var(--money-out)", points: toPoints(c.realPoints, "cumFee") },
                            { key: "paid", label: "Đã tự trả", color: "var(--money-in)", points: toPoints(c.realPoints, "cumPaid") },
                            ...(showProjected
                                ? [
                                      { key: "debt-p", label: "Dự kiến", color: "var(--debt)", points: toPoints(projectedWithJoin, "debt"), dashed: true },
                                      { key: "fee-p", label: "", color: "var(--money-out)", points: toPoints(projectedWithJoin, "cumFee"), dashed: true },
                                      { key: "paid-p", label: "", color: "var(--money-in)", points: toPoints(projectedWithJoin, "cumPaid"), dashed: true },
                                  ]
                                : []),
                        ].filter((s) => s.points.length > 0)}
                        baseline={{ value: c.base, label: `Gốc ${formatMoney(c.base)}` }}
                        divider={showProjected ? { x: lastReal.period, label: "hôm nay" } : undefined}
                        markers={showProjected && c.projection?.debtFreePeriod ? [{ x: c.count + c.projection.debtFreePeriod, y: 0, label: `sạch nợ ${c.debtFreeDate?.format("MM/YYYY")}`, color: "var(--money-in)" }] : []}
                        xLabels={[{ x: 0, label: c.realPoints[0].date.format("DD/MM") }, { x: lastPeriod, label: (showProjected ? c.projectedPoints[c.projectedPoints.length - 1].date : lastReal.date).format("MM/YYYY") }]}
                    />
                </div>
            </div>
        </section>
    );
}
