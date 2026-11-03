import { formatPercent } from "@/libs/utils/formatMoney";
import { cn } from "@/libs/shadcn/utils";

interface IChangeTextProps {
    /** % thay đổi so với kỳ so sánh; null khi kỳ so sánh bằng 0 (không so được) */
    ratio: number | null;
    /** true: tăng là tốt (thu nhập); false: tăng là xấu (chi tiêu) */
    higherIsBetter: boolean;
    /** VD: "cùng kỳ", "tháng trước" */
    compareLabel: string;
}

export default function ChangeText({ ratio, higherIsBetter, compareLabel }: IChangeTextProps) {
    if (ratio === null) return <span>{`Chưa có số liệu ${compareLabel}`}</span>;
    if (ratio === 0) return <span>{`Bằng ${compareLabel}`}</span>;
    const isGood = ratio > 0 === higherIsBetter;
    return (
        <span className={cn(isGood ? "text-money-in" : "text-money-out")}>
            {ratio > 0 ? "▲" : "▼"} {formatPercent(Math.abs(ratio))} so với {compareLabel}
        </span>
    );
}
