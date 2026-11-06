"use client";

import dayjs, { type Dayjs } from "dayjs";
import DateRangeFields from "@/components/common/date-range-fields";
import { useIsMobile } from "@/libs/hooks/use-mobile";

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

/** Lọc khoảng ngày: desktop 2 ô trên một hàng, mobile xếp dọc. Cho phép bỏ trống một đầu. */
export default function DayRangeFilter({ value, onChange }: DayRangeFilterProps) {
    const isMobile = useIsMobile();
    const current: [Dayjs | null, Dayjs | null] = [toDayjs(value.from), toDayjs(value.to)];

    return (
        <DateRangeFields
            inline={!isMobile}
            value={current}
            onChange={(range) => onChange(toRange(range))}
        />
    );
}
