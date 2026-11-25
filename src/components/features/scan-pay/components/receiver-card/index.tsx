"use client";

import { Landmark } from "lucide-react";
import { useScanPayContext } from "@/components/features/scan-pay/context";

/** Người nhận đọc từ mã QR: ngân hàng, số TK, tên (nếu QR có). */
export default function ReceiverCard() {
    const { qr, receiverBank } = useScanPayContext();
    if (!qr) return null;

    return (
        <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
            {receiverBank?.logo ? (
                // Logo từ CDN của VietQR, không qua next/image để khỏi khai báo domain
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={receiverBank.logo}
                    alt=""
                    className="h-9 w-14 shrink-0 rounded bg-white object-contain"
                />
            ) : (
                <span className="flex size-9 shrink-0 items-center justify-center rounded bg-muted">
                    <Landmark className="size-4 text-muted-foreground" />
                </span>
            )}
            <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-muted-foreground">
                    Chuyển tới · {receiverBank?.shortName ?? `Ngân hàng ${qr.bin}`}
                    {qr.isCard ? " · số thẻ" : null}
                </p>
                <p className="truncate font-medium tabular-nums">{qr.accountNumber}</p>
                {qr.receiverName ? (
                    <p className="truncate text-sm text-muted-foreground">{qr.receiverName}</p>
                ) : null}
            </div>
        </div>
    );
}
