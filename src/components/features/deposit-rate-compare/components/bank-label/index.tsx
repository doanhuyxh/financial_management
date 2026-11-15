"use client";

import { Landmark } from "lucide-react";
import { Badge } from "@/components/shadcn/ui/badge";
import { useDepositRateCompareContext } from "@/components/features/deposit-rate-compare/context";
import { cn } from "@/libs/shadcn/utils";

export interface IBankLabelItem {
    bankCode: string;
    bankName: string;
    product?: string;
    isManual?: boolean;
}

/** Logo + tên ngân hàng + sản phẩm; bảng tự nhập có nhãn "Tự nhập". */
export default function BankLabel({
    item,
    compact,
    className,
}: {
    item: IBankLabelItem;
    compact?: boolean;
    className?: string;
}) {
    const { getBankLogo } = useDepositRateCompareContext();
    const logo = getBankLogo(item.bankCode);

    return (
        <span className={cn("flex min-w-0 items-center gap-2", className)}>
            <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-white">
                {logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logo} alt="" className="size-full object-contain" loading="lazy" />
                ) : (
                    <Landmark className="size-4 text-muted-foreground" />
                )}
            </span>
            <span className="flex min-w-0 flex-col text-left">
                <span className="truncate text-sm font-medium">{item.bankName}</span>
                {!compact ? (
                    <span className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                        <span className="truncate">{item.product || "—"}</span>
                        {item.isManual ? (
                            <Badge variant="outline" className="h-4 shrink-0 px-1.5 text-[10px]">
                                Tự nhập
                            </Badge>
                        ) : null}
                    </span>
                ) : null}
            </span>
        </span>
    );
}
