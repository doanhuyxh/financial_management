"use client";

import { DatePicker } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import ChoiceChips from "@/components/common/choice-chips";

interface IQuickDateFieldProps {
    /** antd Form.Item tự truyền value/onChange */
    value?: Dayjs | null;
    onChange?: (value: Dayjs) => void;
}

/** Ô ngày cho form giao dịch: chip "Hôm nay" / "Hôm qua" + DatePicker cho ngày khác. */
export default function QuickDateField({ value, onChange }: IQuickDateFieldProps) {
    const today = dayjs();
    const selected = value?.isSame(today, "day")
        ? "today"
        : value?.isSame(today.subtract(1, "day"), "day")
          ? "yesterday"
          : null;

    return (
        <div className="flex flex-wrap items-center gap-2">
            <ChoiceChips
                options={[
                    { value: "today", label: "Hôm nay" },
                    { value: "yesterday", label: "Hôm qua" },
                ]}
                value={selected}
                onChange={(key) =>
                    onChange?.(key === "today" ? dayjs() : dayjs().subtract(1, "day"))
                }
            />
            <DatePicker
                inputReadOnly
                allowClear={false}
                format="DD/MM/YYYY"
                value={value}
                onChange={(next) => next && onChange?.(next)}
                className="min-w-36 flex-1"
            />
        </div>
    );
}
