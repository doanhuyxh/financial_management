"use client";

import { DatePicker } from "antd";
import type { Dayjs } from "dayjs";

type DateRangeValue = [Dayjs | null, Dayjs | null] | null;

type DateRangeFieldsProps = {
    value: DateRangeValue;
    onChange: (range: DateRangeValue) => void;
};

export default function DateRangeFields({ value, onChange }: DateRangeFieldsProps) {
    const [from, to] = value ?? [null, null];

    return (
        <div className="flex flex-col gap-3">
            <DatePicker
                inputReadOnly
                placeholder="Từ ngày"
                value={from}
                format="DD/MM/YYYY"
                className="w-full"
                onChange={(next) => onChange(next || to ? [next, to] : null)}
            />
            <DatePicker
                inputReadOnly
                placeholder="Đến ngày"
                value={to}
                format="DD/MM/YYYY"
                className="w-full"
                onChange={(next) => onChange(from || next ? [from, next] : null)}
            />
        </div>
    );
}
