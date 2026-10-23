import { formatPercent } from "@/libs/utils/formatMoney";
import { cn } from "@/libs/shadcn/utils";

interface IChangeTextProps {
    /** % thay đổi so với tháng trước; null khi không so được */
    ratio: number | null;
    /** true: tăng là tốt (thu nhập); false: tăng là xấu (chi tiêu) */
    higherIsBetter: boolean;
}

export default function ChangeText({ ratio, higherIsBetter }: IChangeTextProps) {
    if (ratio === null) return <span>Tháng trước: chưa có số liệu</span>;
    if (ratio === 0) return <span>Bằng tháng trước</span>;
    const isGood = ratio > 0 === higherIsBetter;
    return (
        <span className={cn(isGood ? "text-green-600" : "text-red-500")}>
            {ratio > 0 ? "▲" : "▼"} {formatPercent(Math.abs(ratio))} so với tháng trước
        </span>
    );
}
