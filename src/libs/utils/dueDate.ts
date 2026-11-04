import dayjs, { type Dayjs } from "dayjs";

/** Lần tới gần nhất (từ `today`) có ngày = `dueDay` (1–31); tháng ngắn hơn thì lấy ngày cuối tháng. */
export function getNextDueDate(dueDay: number, today: Dayjs = dayjs()): Dayjs {
    const start = today.startOf("day");
    const inMonth = (month: Dayjs) => month.date(Math.min(dueDay, month.daysInMonth()));

    const thisMonth = inMonth(start.startOf("month"));
    if (!thisMonth.isBefore(start, "day")) return thisMonth;
    return inMonth(start.startOf("month").add(1, "month"));
}
