import dayjs, { type Dayjs } from "dayjs";
import type { ICardRolloverData } from "@/libs/interfaces/cardRolloversData";
import type {
    IRolloverJourneyDetail,
    IRolloverJourneyPayment,
} from "@/libs/interfaces/rolloverJourneysData";
import { getStatementCycle } from "@/libs/utils/statementCycle";
import {
    minPaymentToReduce,
    paymentToFinishIn,
    projectRollovers,
    type IRolloverProjectionResult,
} from "@/libs/utils/rolloverProjection";

export type JourneyView = "all" | "real";

/** Mốc cảnh báo phí tích lũy / gốc */
export const FEE_MILESTONES = [0.1, 0.25, 0.5, 0.75, 1];

export interface IJourneyPoint {
    /** 0 = bắt đầu, k = sau lần đáo thứ k (dự kiến nối tiếp) */
    period: number;
    date: Dayjs;
    debt: number;
    cumFee: number;
    cumPaid: number;
    projected?: boolean;
}

export type JourneyEventKind = "start" | "payment" | "rollover" | "projected" | "end" | "more";

export interface IJourneyEvent {
    key: string;
    kind: JourneyEventKind;
    date: Dayjs | null;
    title: string;
    meta?: string;
    /** Cột phải: nợ sau sự kiện và phí tích lũy */
    debtAfter?: number;
    cumFee?: number;
    feeRatio?: number;
    /** Mốc cảnh báo vừa vượt qua ở lần đáo này (VD 0.5) */
    milestone?: number;
    rollover?: ICardRolloverData;
}

export interface IJourneyComputed {
    base: number;
    isOpen: boolean;
    /** Dư nợ thẻ hiện tại (hành trình mở) hoặc nợ sau lần đáo cuối (đã đóng) */
    debtNow: number;
    count: number;
    totalFee: number;
    totalPaid: number;
    feeRatio: number;
    realPoints: IJourneyPoint[];
    projectedPoints: IJourneyPoint[];
    projection: IRolloverProjectionResult | null;
    /** Tự trả trung bình 3 kỳ gần nhất, dùng làm nhịp dự kiến */
    avgPayment: number;
    feePercent: number;
    cycleDays: number;
    debtFreeDate: Dayjs | null;
    /** Số lần nữa (từ hôm nay) thì phí tích lũy bằng gốc; null nếu không chạm */
    remainingToBreakEven: number | null;
    minPayment: number;
    faster: { n: number; payment: number; totalFee: number; date: Dayjs }[];
    events: IJourneyEvent[];
}

function sourceOf(detail: IRolloverJourneyDetail) {
    const source = detail.journey.sourceOfMoneyId;
    return typeof source === "string" ? null : source;
}

function paymentsBetween(payments: IRolloverJourneyPayment[], from: Dayjs | null, to: Dayjs) {
    return payments.filter((payment) => {
        const at = dayjs(payment.transferredAt);
        return (from == null || at.isAfter(from)) && !at.isAfter(to);
    });
}

/** Gộp lần đáo, khoản tự trả và dự kiến thành số liệu, điểm biểu đồ và dòng thời gian. */
export function computeJourney(detail: IRolloverJourneyDetail, view: JourneyView): IJourneyComputed {
    const { journey, rollovers, payments } = detail;
    const source = sourceOf(detail);
    const base = journey.baseAmount;
    const isOpen = !journey.endedAt;
    const startedAt = dayjs(journey.startedAt);

    const realPoints: IJourneyPoint[] = [{ period: 0, date: startedAt, debt: base, cumFee: 0, cumPaid: 0 }];
    const events: IJourneyEvent[] = [
        {
            key: "start",
            kind: "start",
            date: startedAt,
            title: "Bắt đầu hành trình",
            meta: `Gốc ${base.toLocaleString("vi-VN")} ₫${source ? ` · ${source.name}` : ""}`,
        },
    ];

    let cumFee = 0;
    let cumPaid = 0;
    let prevDate: Dayjs | null = null;
    let lastDebt = base;
    const paymentPerRollover: number[] = [];
    let passedMilestone = 0;

    rollovers.forEach((rollover, index) => {
        const rolledAt = dayjs(rollover.rolledAt);
        const windowPayments = paymentsBetween(payments, prevDate, rolledAt);
        const paidThisCycle = windowPayments.reduce((sum, payment) => sum + payment.amount, 0);
        for (const payment of windowPayments) {
            events.push({
                key: `pay-${payment._id}`,
                kind: "payment",
                date: dayjs(payment.transferredAt),
                title: `Bạn tự trả ${payment.amount.toLocaleString("vi-VN")} ₫`,
                meta: payment.fromSource ? `Chuyển tiền từ ${payment.fromSource.name} → thẻ` : "Chuyển tiền vào thẻ",
            });
        }
        cumFee += rollover.feeAmount;
        cumPaid += paidThisCycle;
        lastDebt = rollover.amount + rollover.feeAmount;
        paymentPerRollover.push(paidThisCycle);
        const ratio = base > 0 ? cumFee / base : 0;
        let milestone: number | undefined;
        for (const mark of FEE_MILESTONES) {
            if (ratio >= mark && passedMilestone < mark) {
                milestone = mark;
                passedMilestone = mark;
            }
        }
        realPoints.push({ period: index + 1, date: rolledAt, debt: lastDebt, cumFee, cumPaid });
        events.push({
            key: `roll-${rollover._id}`,
            kind: "rollover",
            date: rolledAt,
            title: `Đáo hạn lần ${index + 1} · dịch vụ ứng ${rollover.amount.toLocaleString("vi-VN")} ₫`,
            meta: `Quẹt lại ${lastDebt.toLocaleString("vi-VN")} ₫ · phí ${rollover.feeAmount.toLocaleString("vi-VN")} ₫${
                rollover.amount > 0 ? ` (${((rollover.feeAmount / rollover.amount) * 100).toFixed(1)}%)` : ""
            }${rollover.provider ? ` · ${rollover.provider}` : ""}${rollover.note ? ` · ${rollover.note}` : ""}`,
            debtAfter: lastDebt,
            cumFee,
            feeRatio: ratio,
            milestone,
            rollover,
        });
        prevDate = rolledAt;
    });

    // Khoản tự trả sau lần đáo cuối (chưa có lần đáo tiếp theo)
    const trailing = paymentsBetween(payments, prevDate, journey.endedAt ? dayjs(journey.endedAt) : dayjs().add(1, "day"));
    for (const payment of trailing) {
        cumPaid += payment.amount;
        lastDebt = Math.max(0, lastDebt - payment.amount);
        events.push({
            key: `pay-${payment._id}`,
            kind: "payment",
            date: dayjs(payment.transferredAt),
            title: `Bạn tự trả ${payment.amount.toLocaleString("vi-VN")} ₫`,
            meta: payment.fromSource ? `Chuyển tiền từ ${payment.fromSource.name} → thẻ` : "Chuyển tiền vào thẻ",
            debtAfter: lastDebt,
        });
    }
    if (trailing.length > 0) {
        realPoints.push({
            period: rollovers.length,
            date: dayjs(trailing[trailing.length - 1].transferredAt),
            debt: lastDebt,
            cumFee,
            cumPaid,
        });
    }

    const debtNow = isOpen ? (source?.creditDetails?.currentDebt ?? lastDebt) : lastDebt;
    const count = rollovers.length;
    const recent = paymentPerRollover.slice(-3);
    const avgPayment = recent.length > 0 ? Math.round(recent.reduce((a, b) => a + b, 0) / recent.length) : 0;
    const last = rollovers[rollovers.length - 1];
    const feePercent =
        last?.feePercent || (last && last.amount > 0 ? (last.feeAmount / last.amount) * 100 : 0) ||
        source?.creditDetails?.rolloverFeePercent ||
        0;
    let cycleDays: number;
    if (rollovers.length >= 2) {
        const first = dayjs(rollovers[0].rolledAt);
        cycleDays = Math.max(7, Math.round(dayjs(last.rolledAt).diff(first, "day") / (rollovers.length - 1)));
    } else {
        const cycle = getStatementCycle(source?.creditDetails?.statementDate, dayjs());
        cycleDays = Math.max(7, cycle.end.diff(cycle.start, "day"));
    }
    const lastDate = last ? dayjs(last.rolledAt) : startedAt;

    let projection: IRolloverProjectionResult | null = null;
    const projectedPoints: IJourneyPoint[] = [];
    let debtFreeDate: Dayjs | null = null;
    if (isOpen && debtNow > 0 && feePercent > 0) {
        projection = projectRollovers({
            debt: debtNow,
            feePercent,
            extraPayment: avgPayment,
            baseAmount: base,
            startCumulativeFee: cumFee,
            startCumulativePaid: cumPaid,
            maxPeriods: 120,
        });
        for (const row of projection.rows) {
            projectedPoints.push({
                period: count + row.period,
                date: lastDate.add(row.period * cycleDays, "day"),
                debt: row.debtAfter,
                cumFee: row.cumulativeFee,
                cumPaid: row.cumulativePaid,
                projected: true,
            });
        }
        if (projection.debtFreePeriod) debtFreeDate = lastDate.add(projection.debtFreePeriod * cycleDays, "day");
    }

    if (view === "all" && projection) {
        const upcoming = projection.rows.slice(0, 3);
        upcoming.forEach((row) => {
            events.push({
                key: `proj-${row.period}`,
                kind: "projected",
                date: lastDate.add(row.period * cycleDays, "day"),
                title: `Lần ${count + row.period} (dự kiến) · tự trả ${row.paid.toLocaleString("vi-VN")} · phí ≈${row.fee.toLocaleString("vi-VN")}`,
                debtAfter: row.debtAfter,
                cumFee: row.cumulativeFee,
                feeRatio: base > 0 ? row.cumulativeFee / base : 0,
            });
        });
        if (projection.rows.length > 3) {
            events.push({ key: "more", kind: "more", date: null, title: `${projection.rows.length - 3} kỳ nữa` });
        }
        if (projection.debtFreePeriod && debtFreeDate) {
            events.push({
                key: "end-projected",
                kind: "end",
                date: debtFreeDate,
                title: "Sạch nợ (dự kiến)",
                meta: `Tổng ${count + projection.debtFreePeriod} kỳ · phí ${projection.totalFee.toLocaleString("vi-VN")} ₫ · tự trả ${projection.totalPaid.toLocaleString("vi-VN")} ₫`,
            });
        }
    }
    if (!isOpen && journey.endedAt) {
        events.push({
            key: "end",
            kind: "end",
            date: dayjs(journey.endedAt),
            title: "Kết thúc hành trình",
            meta: `${count} lần đáo · phí ${cumFee.toLocaleString("vi-VN")} ₫ · tự trả ${cumPaid.toLocaleString("vi-VN")} ₫${journey.note ? ` · ${journey.note}` : ""}`,
        });
    }

    const faster = isOpen && debtNow > 0
        ? [3, 6, 12].map((n) => ({ n, ...paymentToFinishIn(debtNow, feePercent, n), date: lastDate.add(n * cycleDays, "day") }))
        : [];

    return {
        base,
        isOpen,
        debtNow,
        count,
        totalFee: cumFee,
        totalPaid: cumPaid,
        feeRatio: base > 0 ? cumFee / base : 0,
        realPoints,
        projectedPoints,
        projection,
        avgPayment,
        feePercent,
        cycleDays,
        debtFreeDate,
        remainingToBreakEven: projection?.breakEvenPeriod ?? null,
        minPayment: feePercent > 0 ? minPaymentToReduce(debtNow, feePercent) : 0,
        faster,
        events,
    };
}
