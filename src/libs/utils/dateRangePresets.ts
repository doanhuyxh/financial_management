import dayjs, { type Dayjs } from "dayjs";

export interface IDateRangePreset {
    key: string;
    label: string;
    value: [Dayjs, Dayjs];
}

/**
 * Khoảng ngày chọn nhanh cho bộ lọc giao dịch (tính lại mỗi lần gọi để luôn theo ngày hiện tại):
 * - 7 ngày qua: hôm nay và 6 ngày trước
 * - Tháng này: ngày 1 → hôm nay
 * - 3 tháng gần đây: ngày 1 của tháng cách đây 2 tháng → hôm nay (VD: 01/09 → 03/11)
 */
export function getDateRangePresets(): IDateRangePreset[] {
    const today = dayjs();
    const end = today.endOf("day");
    return [
        { key: "7d", label: "7 ngày qua", value: [today.subtract(6, "day").startOf("day"), end] },
        { key: "month", label: "Tháng này", value: [today.startOf("month"), end] },
        {
            key: "3m",
            label: "3 tháng gần đây",
            value: [today.subtract(2, "month").startOf("month"), end],
        },
    ];
}

/** Preset trùng với khoảng ngày đang chọn (so theo ngày), không có thì null. */
export function matchDateRangePreset(range?: [Dayjs | null, Dayjs | null] | null) {
    const [from, to] = range ?? [];
    if (!from || !to) return null;
    return (
        getDateRangePresets().find(
            (preset) => preset.value[0].isSame(from, "day") && preset.value[1].isSame(to, "day"),
        ) ?? null
    );
}
