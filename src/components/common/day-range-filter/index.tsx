"use client";

import { DatePicker } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import DateRangeFields from "@/components/common/date-range-fields";
import { useIsMobile } from "@/libs/hooks/use-mobile";

const { RangePicker } = DatePicker;
const DAY_FORMAT = "YYYY-MM-DD";

/** Khoảng ngày dạng chuỗi YYYY-MM-DD (dùng thẳng làm query API). */
export type DayRange = { from?: string; to?: string };

type DayRangeFilterProps = {
    value: DayRange;
    onChange: (range: DayRange) => void;
};

function toDayjs(value?: string) {
    return value ? dayjs(value, DAY_FORMAT) : null;
}

function toRange(range: [Dayjs | null, Dayjs | null] | null): DayRange {
    return {
        from: range?.[0]?.format(DAY_FORMAT),
        to: range?.[1]?.format(DAY_FORMAT),
    };
}

export default function DayRangeFilter({ value, onChange }: DayRangeFilterProps) {
    const isMobile = useIsMobile();
    const current: [Dayjs | null, Dayjs | null] = [toDayjs(value.from), toDayjs(value.to)];

    if (isMobile) {
        return <DateRangeFields value={current} onChange={(range) => onChange(toRange(range))} />;
    }

    return (
        <RangePicker
            inputReadOnly
            allowEmpty={[true, true]}
            value={current}
            onChange={(dates) => onChange(toRange(dates ? [dates[0], dates[1]] : null))}
            className="w-full"
            format="DD/MM/YYYY"
            allowClear
        />
    );
}
