"use client";

import { usePublicShareContext } from "@/components/features/public-share/context";

function formatDay(value?: string | null) {
    if (!value) return "…";
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
}

export default function ShareHeader() {
    const { info, isCreditCard } = usePublicShareContext();
    if (!info) return null;

    return (
        <div className="flex flex-col gap-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Lịch sử giao dịch
            </p>
            <h1 className="text-xl font-semibold break-words">{info.sourceName}</h1>
            {info.from || info.to ? (
                <p className="text-xs text-muted-foreground">
                    Giao dịch từ {formatDay(info.from)} đến {formatDay(info.to)}
                </p>
            ) : null}
            {isCreditCard ? (
                <p className="text-xs text-muted-foreground">
                    Thẻ tín dụng: dấu + là tăng dư nợ, dấu − là giảm dư nợ.
                </p>
            ) : null}
        </div>
    );
}
