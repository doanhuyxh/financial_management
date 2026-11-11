"use client";

import type { Dayjs } from "dayjs";
import DatePicker from "@/components/common/date-picker";
import { cn } from "@/libs/shadcn/utils";

type DateRangeValue = [Dayjs | null, Dayjs | null] | null;

type DateRangeFieldsProps = {
    value: DateRangeValue;
    onChange: (range: DateRangeValue) => void;
    /** Xếp 2 ô trên một hàng (toolbar desktop); mặc định xếp dọc (drawer mobile) */
    inline?: boolean;
    className?: string;
};

/** Khoảng ngày bằng 2 ô "Từ ngày" / "Đến ngày" (thay antd RangePicker); ngày kết thúc không trước ngày bắt đầu. */
export default function DateRangeFields({ value, onChange, inline = false, className }: DateRangeFieldsProps) {
    const [from, to] = value ?? [null, null];
    const pickerClass = inline ? "min-w-0 flex-1" : "w-full";

    return (
        <div className={cn(inline ? "flex items-center gap-2" : "flex flex-col gap-3", className)}>
            <DatePicker
                placeholder="Từ ngày"
                aria-label="Từ ngày"
                value={from}
                format="DD/MM/YYYY"
                className={pickerClass}
                disabledDate={(date) => Boolean(to && date.isAfter(to, "day"))}
                onChange={(next) => onChange(next || to ? [next, to] : null)}
            />
            {inline ? (
                <span className="shrink-0 text-muted-foreground" aria-hidden>
                    →
                </span>
            ) : null}
            <DatePicker
                placeholder="Đến ngày"
                aria-label="Đến ngày"
                value={to}
                format="DD/MM/YYYY"
                className={pickerClass}
                disabledDate={(date) => Boolean(from && date.isBefore(from, "day"))}
                onChange={(next) => onChange(from || next ? [from, next] : null)}
            />
        </div>
    );
}
