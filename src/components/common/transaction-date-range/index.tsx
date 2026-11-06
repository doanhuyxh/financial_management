"use client";

import type { Dayjs } from "dayjs";
import ChoiceChips from "@/components/common/choice-chips";
import DateRangeFields from "@/components/common/date-range-fields";
import { getDateRangePresets, matchDateRangePreset } from "@/libs/utils/dateRangePresets";

type DateRange = [Dayjs | null, Dayjs | null] | null;

interface ITransactionDateRangeProps {
    value: DateRange;
    onChange: (range: DateRange) => void;
    layout: "desktop" | "drawer";
}

/**
 * Lọc khoảng ngày cho danh sách giao dịch, có chọn nhanh "7 ngày qua / Tháng này / 3 tháng gần đây".
 * Desktop: chip chọn nhanh + 2 ô ngày trên một hàng của toolbar. Drawer mobile: chip + 2 ô ngày xếp dọc.
 */
export default function TransactionDateRange({ value, onChange, layout }: ITransactionDateRangeProps) {
    const presets = getDateRangePresets();
    const chips = (
        <ChoiceChips
            options={presets.map((preset) => ({ value: preset.key, label: preset.label }))}
            value={matchDateRangePreset(value)?.key ?? null}
            onChange={(key) => {
                const preset = presets.find((item) => item.key === key);
                if (preset) onChange(preset.value);
            }}
        />
    );

    if (layout === "desktop") {
        return (
            <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
                {chips}
                <DateRangeFields inline value={value} onChange={onChange} className="w-full lg:w-80" />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2">
            {chips}
            <DateRangeFields value={value} onChange={onChange} />
        </div>
    );
}
