import dayjs, { type Dayjs } from "dayjs";

/** Ngày `day` (1–31) trong tháng của `month`, tháng ngắn hơn thì lấy ngày cuối tháng. */
function dayInMonth(month: Dayjs, day: number) {
    const monthStart = month.startOf("month");
    return monthStart.date(Math.min(day, monthStart.daysInMonth()));
}

/**
 * Kỳ sao kê chứa `today`: [ngày sau lần chốt trước, ngày sau lần chốt kế tiếp).
 * Ngày chốt sao kê thuộc kỳ kết thúc vào ngày đó. Thẻ chưa đặt ngày sao kê thì dùng
 * tháng dương lịch. Dùng chung cho dashboard và server.
 */
export function getStatementCycle(
    statementDate: number | undefined,
    today: Dayjs = dayjs(),
): { start: Dayjs; end: Dayjs } {
    const start = today.startOf("day");
    if (!statementDate) {
        const monthStart = start.startOf("month");
        return { start: monthStart, end: monthStart.add(1, "month") };
    }

    let closing = dayInMonth(start, statementDate);
    if (closing.isBefore(start, "day")) {
        closing = dayInMonth(start.startOf("month").add(1, "month"), statementDate);
    }
    const previousClosing = dayInMonth(
        closing.startOf("month").subtract(1, "month"),
        statementDate,
    );
    return { start: previousClosing.add(1, "day"), end: closing.add(1, "day") };
}
