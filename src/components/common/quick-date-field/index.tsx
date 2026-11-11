"use client";

import dayjs, { type Dayjs } from "dayjs";
import { Lock } from "lucide-react";
import ChoiceChips from "@/components/common/choice-chips";
import DatePicker from "@/components/common/date-picker";
import { useLedgerLock } from "@/libs/hooks/customHooks/useSettings";
import { formatDate } from "@/libs/utils/formatDate";

interface IQuickDateFieldProps {
    /** Form.Item hoặc Controller (react-hook-form) tự truyền value/onChange */
    value?: Dayjs | null;
    onChange?: (value: Dayjs) => void;
}

/**
 * Ô ngày cho form giao dịch: chip "Hôm nay" / "Hôm qua" + DatePicker cho ngày khác.
 * Đã khóa sổ thì không cho chọn ngày trước mốc và hiện mốc khóa (server vẫn kiểm tra lại).
 */
export default function QuickDateField({ value, onChange }: IQuickDateFieldProps) {
    const lock = useLedgerLock();
    const today = dayjs();
    const yesterday = today.subtract(1, "day");
    const isLocked = (date: Dayjs) => Boolean(lock && date.isBefore(lock, "day"));

    const selected = value?.isSame(today, "day")
        ? "today"
        : value?.isSame(yesterday, "day")
          ? "yesterday"
          : null;
    const chipOptions = [
        { value: "today", label: "Hôm nay", date: today },
        { value: "yesterday", label: "Hôm qua", date: yesterday },
    ].filter((option) => !isLocked(option.date));

    return (
        <div className="flex flex-wrap items-center gap-2">
            <ChoiceChips
                options={chipOptions.map(({ value: key, label }) => ({ value: key, label }))}
                value={selected}
                onChange={(key) => onChange?.(key === "today" ? dayjs() : dayjs().subtract(1, "day"))}
            />
            <DatePicker
                allowClear={false}
                format="DD/MM/YYYY"
                value={value}
                onChange={(next) => {
                    if (next) onChange?.(next);
                }}
                // Server nhận tối đa 1 ngày sau hôm nay
                disabledDate={(date) => isLocked(date) || date.isAfter(today.add(1, "day"), "day")}
                className="min-w-36 flex-1"
            />
            {lock ? (
                <p
                    className={
                        value && isLocked(value)
                            ? "flex w-full items-center gap-1 text-xs text-warn"
                            : "flex w-full items-center gap-1 text-xs text-muted-foreground"
                    }
                >
                    <Lock className="size-3" />
                    {value && isLocked(value)
                        ? `Ngày này thuộc kỳ đã khóa sổ (trước ${formatDate(lock.toDate())}), không lưu được`
                        : `Đã khóa sổ trước ${formatDate(lock.toDate())}`}
                </p>
            ) : null}
        </div>
    );
}
