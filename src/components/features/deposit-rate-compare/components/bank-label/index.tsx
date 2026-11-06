"use client";

import { Landmark } from "lucide-react";
import { Badge } from "@/components/shadcn/ui/badge";
import { useDepositRateCompareContext } from "@/components/features/deposit-rate-compare/context";
import { DepositRateOrigin, type IDepositRateTableData } from "@/libs/interfaces/depositRatesData";

/** Logo + tên ngân hàng + sản phẩm; bảng tự nhập có nhãn "Tự nhập". */
export default function BankLabel({ table, compact }: { table: IDepositRateTableData; compact?: boolean }) {
    const { getBankLogo } = useDepositRateCompareContext();
    const logo = getBankLogo(table.bankCode);

    return (
        <span className="flex min-w-0 items-center gap-2">
            <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-white">
                {logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logo} alt="" className="size-full object-contain" loading="lazy" />
                ) : (
                    <Landmark className="size-4 text-muted-foreground" />
                )}
            </span>
            <span className="flex min-w-0 flex-col text-left">
                <span className="truncate text-sm font-medium">{table.bankName}</span>
                {!compact ? (
                    <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                        {table.product || "—"}
                        {table.origin === DepositRateOrigin.MANUAL ? (
                            <Badge variant="outline" className="h-4 px-1.5 text-[10px]">
                                Tự nhập
                            </Badge>
                        ) : null}
                    </span>
                ) : null}
            </span>
        </span>
    );
}
