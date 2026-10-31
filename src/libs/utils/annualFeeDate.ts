import dayjs, { type Dayjs } from "dayjs";

/**
 * Lần thu phí thường niên kế tiếp (ngày `day`, tháng `month`) tính từ `today`;
 * hôm nay tính là kỳ này, 29/02 năm thường lùi về 28/02.
 * Dùng chung cho dashboard và server (năm thẻ = 12 tháng trước ngày này).
 */
export function getNextAnnualDate(day: number, month: number, today: Dayjs = dayjs()): Dayjs {
    const start = today.startOf("day");
    const inYear = (year: number) => {
        const monthStart = dayjs(new Date(year, month - 1, 1));
        return monthStart.date(Math.min(day, monthStart.daysInMonth()));
    };

    const thisYear = inYear(start.year());
    if (!thisYear.isBefore(start, "day")) return thisYear;
    return inYear(start.year() + 1);
}
