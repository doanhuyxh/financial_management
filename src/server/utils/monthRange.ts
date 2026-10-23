export function pad2(n: number) {
    return String(n).padStart(2, "0");
}

export function isValidMonth(year: number, month: number) {
    return Number.isInteger(year) && Number.isInteger(month) && month >= 1 && month <= 12;
}

/** Ngày 1 00:00 đến cuối tháng 23:59:59.999, theo giờ VN (+07:00). */
export function getMonthRange(year: number, month: number) {
    const daysInMonth = new Date(year, month, 0).getDate();
    const start = new Date(`${year}-${pad2(month)}-01T00:00:00.000+07:00`);
    const end = new Date(
        `${year}-${pad2(month)}-${pad2(daysInMonth)}T23:59:59.999+07:00`,
    );
    return { start, end, daysInMonth };
}
