"use client";

import Money from "@/components/common/money";
import { useRolloverJourneyContext } from "@/components/features/rollover-journey/context";
import { formatMoney } from "@/libs/utils/formatMoney";

/** Cột phải: nếu giữ nhịp hiện tại, để sạch nợ sớm hơn, cách kết thúc. */
export default function JourneySidePanels() {
    const { computed } = useRolloverJourneyContext();
    if (!computed) return null;
    const c = computed;

    return (
        <div className="flex flex-col gap-4">
            {c.isOpen ? (
                <section className="rounded-xl border border-border bg-card p-4">
                    <p className="mb-2 font-semibold">Nếu giữ nhịp hiện tại</p>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className="rounded-lg border border-border px-3 py-2"><p className="text-xs text-muted-foreground">Còn</p><p className="font-bold">{c.projection?.debtFreePeriod ? `${c.projection.debtFreePeriod} kỳ` : "∞"}</p></div>
                        <div className="rounded-lg border border-border px-3 py-2"><p className="text-xs text-muted-foreground">Phí sẽ mất thêm</p><p className="font-bold"><Money value={c.projection?.debtFreePeriod ? c.projection.totalFee - c.totalFee : null} kind="out" /></p></div>
                        <div className="rounded-lg border border-border px-3 py-2"><p className="text-xs text-muted-foreground">Tổng phí cả hành trình</p><p className="font-bold"><Money value={c.projection?.debtFreePeriod ? c.projection.totalFee : null} kind="out" /></p>{c.projection?.debtFreePeriod ? <p className="text-xs text-muted-foreground">{Math.round((c.projection.totalFee / c.base) * 100)}% gốc</p> : null}</div>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                        Nhịp = trung bình tự trả 3 kỳ gần nhất ({formatMoney(c.avgPayment)}), phí {c.feePercent.toFixed(2)}%/lần, chu kỳ {c.cycleDays} ngày. Bấm &quot;Mô phỏng&quot; để đổi giả định.
                    </p>
                </section>
            ) : null}
            {c.faster.length > 0 ? (
                <section className="rounded-xl border border-border bg-card p-4">
                    <p className="mb-2 font-semibold">Để sạch nợ sớm hơn</p>
                    <table className="w-full text-xs tabular-nums">
                        <tbody>
                            {c.faster.map((item) => (
                                <tr key={item.n} className="border-t border-border">
                                    <td className="py-1.5">Sạch nợ trong <b>{item.n} kỳ</b> ({item.date.format("MM/YYYY")})</td>
                                    <td className="py-1.5 text-right">trả <b>{formatMoney(item.payment)}</b>/kỳ</td>
                                    <td className="py-1.5 text-right text-money-out">phí thêm {formatMoney(item.totalFee)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>
            ) : null}
            <section className="rounded-xl border border-dashed border-border bg-muted p-3 text-xs text-muted-foreground">
                <p className="mb-1 font-semibold text-foreground">Khi hành trình kết thúc</p>
                Nợ về 0 thì hệ thống tự đóng. Nếu bạn thoát bằng cách khác (trả góp, vay chỗ khác), bấm &quot;Kết thúc hành trình&quot; để
                lưu tổng kết; lần đáo hạn sau sẽ mở hành trình mới.
            </section>
        </div>
    );
}
