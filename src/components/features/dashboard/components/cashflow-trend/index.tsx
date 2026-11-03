"use client";

import TrendChart from "@/components/features/dashboard/components/cashflow-trend/components/trend-chart";

/** Thu – chi theo tháng, tối đa 6 tháng, chỉ từ tháng bắt đầu có dữ liệu. */
export default function CashflowTrend() {
    return (
        <section className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
            <div>
                <h2 className="text-base font-semibold">Xu hướng thu – chi</h2>
                <p className="text-xs text-muted-foreground">
                    Tối đa 6 tháng gần nhất · gồm phí chuyển tiền · * tháng đang chạy
                </p>
            </div>
            <TrendChart />
        </section>
    );
}
