"use client";

import { useState } from "react";
import dayjs, { type Dayjs } from "dayjs";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { vi } from "react-day-picker/locale";
import { Button } from "@/components/shadcn/ui/button";
import { Calendar } from "@/components/shadcn/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/shadcn/ui/popover";
import { useFieldStatus } from "@/components/common/form-field";
import { cn } from "@/libs/shadcn/utils";

export interface IDatePickerProps {
    value?: Dayjs | null;
    onChange?: (value: Dayjs | null) => void;
    /** `month`: chọn tháng (lưới 12 tháng), giá trị là ngày đầu tháng */
    picker?: "date" | "month";
    /** Định dạng hiển thị (dayjs). Mặc định DD/MM/YYYY, chọn tháng là MM/YYYY */
    format?: string;
    placeholder?: string;
    allowClear?: boolean;
    /** Ngày không chọn được (chọn tháng: nhận ngày đầu tháng) */
    disabledDate?: (date: Dayjs) => boolean;
    disabled?: boolean;
    size?: "sm" | "default";
    className?: string;
    id?: string;
    "aria-label"?: string;
}

const MONTH_LABELS = Array.from({ length: 12 }, (_, index) => `Tháng ${index + 1}`);

function MonthGrid({
    value,
    onPick,
    disabledDate,
}: {
    value: Dayjs | null | undefined;
    onPick: (date: Dayjs) => void;
    disabledDate?: (date: Dayjs) => boolean;
}) {
    const [year, setYear] = useState(() => (value ?? dayjs()).year());
    const thisMonth = dayjs().startOf("month");
    return (
        <div className="flex w-64 flex-col gap-2 p-2">
            <div className="flex items-center justify-between">
                <Button type="button" variant="ghost" size="icon" aria-label="Năm trước" onClick={() => setYear(year - 1)}>
                    <ChevronLeft />
                </Button>
                <span className="text-sm font-medium tabular-nums">{year}</span>
                <Button type="button" variant="ghost" size="icon" aria-label="Năm sau" onClick={() => setYear(year + 1)}>
                    <ChevronRight />
                </Button>
            </div>
            <div className="grid grid-cols-3 gap-1">
                {MONTH_LABELS.map((label, index) => {
                    const month = dayjs().year(year).month(index).startOf("month");
                    const selected = Boolean(value && value.isSame(month, "month"));
                    const isCurrent = month.isSame(thisMonth, "month");
                    return (
                        <Button
                            key={label}
                            type="button"
                            variant={selected ? "default" : "ghost"}
                            size="sm"
                            disabled={disabledDate?.(month)}
                            className={cn("font-normal", !selected && isCurrent && "bg-muted")}
                            onClick={() => onPick(month)}
                        >
                            {label}
                        </Button>
                    );
                })}
            </div>
        </div>
    );
}

/** Ô chọn ngày (hoặc tháng) dạng nút + lịch bật lên; giá trị Dayjs (thay antd DatePicker). */
export default function DatePicker({
    value,
    onChange,
    picker = "date",
    format,
    placeholder,
    allowClear = true,
    disabledDate,
    disabled = false,
    size = "default",
    className,
    id,
    "aria-label": ariaLabel,
}: IDatePickerProps) {
    const [open, setOpen] = useState(false);
    const status = useFieldStatus();
    const displayFormat = format ?? (picker === "month" ? "MM/YYYY" : "DD/MM/YYYY");
    const text = value ? value.format(displayFormat) : null;

    const pick = (next: Dayjs) => {
        onChange?.(next);
        setOpen(false);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    id={id ?? status.id ?? undefined}
                    aria-label={ariaLabel}
                    data-invalid={status.invalid || undefined}
                    disabled={disabled}
                    className={cn(
                        "flex w-full min-w-0 cursor-pointer items-center gap-2 rounded-lg border border-input bg-transparent pr-2 pl-2.5 text-left text-sm transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[invalid=true]:border-destructive data-[invalid=true]:ring-3 data-[invalid=true]:ring-destructive/20 dark:bg-input/30 dark:hover:bg-input/50 dark:data-[invalid=true]:border-destructive/50",
                        size === "sm" ? "h-7" : "h-8",
                        className,
                    )}
                >
                    <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
                    <span className={cn("flex-1 truncate tabular-nums", !text && "text-muted-foreground")}>
                        {text ?? placeholder ?? (picker === "month" ? "Chọn tháng" : "Chọn ngày")}
                    </span>
                    {allowClear && value && !disabled ? (
                        <span
                            role="button"
                            aria-label="Xóa ngày"
                            className="rounded-sm p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                            onPointerDown={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                            }}
                            onClick={(event) => {
                                event.stopPropagation();
                                onChange?.(null);
                            }}
                        >
                            <X className="size-3.5" />
                        </span>
                    ) : null}
                </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0">
                {picker === "month" ? (
                    <MonthGrid value={value} onPick={pick} disabledDate={disabledDate} />
                ) : (
                    <Calendar
                        mode="single"
                        locale={vi}
                        selected={value?.toDate()}
                        defaultMonth={value?.toDate()}
                        disabled={disabledDate ? (date) => disabledDate(dayjs(date)) : undefined}
                        onSelect={(date) => {
                            if (!date) return;
                            // Giữ giờ phút của giá trị cũ (VD: giờ tạo giao dịch), ngày mới lấy giờ hiện tại
                            const base = value ?? dayjs();
                            pick(
                                dayjs(date)
                                    .hour(base.hour())
                                    .minute(base.minute())
                                    .second(base.second()),
                            );
                        }}
                    />
                )}
            </PopoverContent>
        </Popover>
    );
}
