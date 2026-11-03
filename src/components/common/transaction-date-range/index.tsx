"use client";

import { DatePicker } from "antd";
import type { Dayjs } from "dayjs";
import ChoiceChips from "@/components/common/choice-chips";
import DateRangeFields from "@/components/common/date-range-fields";
import { getDateRangePresets, matchDateRangePreset } from "@/libs/utils/dateRangePresets";

const { RangePicker } = DatePicker;

type DateRange = [Dayjs | null, Dayjs | null] | null;

interface ITransactionDateRangeProps {
    value: DateRange;
    onChange: (range: DateRange) => void;
    layout: "desktop" | "drawer";
}

/**
 * Lọc khoảng ngày cho danh sách giao dịch, có chọn nhanh "7 ngày qua / Tháng này / 3 tháng gần đây".
 * Desktop: RangePicker (lựa chọn nhanh nằm trong khung lịch). Drawer mobile: chip + 2 ô ngày.
 */
export default function TransactionDateRange({ value, onChange, layout }: ITransactionDateRangeProps) {
    const presets = getDateRangePresets();

    if (layout === "desktop") {
        return (
            <RangePicker
                inputReadOnly
                value={value}
                onChange={(dates) => onChange(dates ? [dates[0] ?? null, dates[1] ?? null] : null)}
                presets={presets.map((preset) => ({ label: preset.label, value: preset.value }))}
                className="w-full lg:w-auto"
                format="DD/MM/YYYY"
                allowClear
            />
        );
    }

    return (
        <div className="flex flex-col gap-2">
            <ChoiceChips
                options={presets.map((preset) => ({ value: preset.key, label: preset.label }))}
                value={matchDateRangePreset(value)?.key ?? null}
                onChange={(key) => {
                    const preset = presets.find((item) => item.key === key);
                    if (preset) onChange(preset.value);
                }}
            />
            <DateRangeFields value={value} onChange={onChange} />
        </div>
    );
}
