"use client";

import Link from "next/link";
import { CircleCheck, Copy, ExternalLink, ScanQrCode } from "lucide-react";
import Money from "@/components/common/money";
import { Button } from "@/components/shadcn/ui/button";
import { useAppFeedback } from "@/libs/hooks/useAppFeedback";
import { MENU_KEY } from "@/libs/constants/menuKey";
import { buildTransactionsUrl } from "@/libs/utils/transactionsUrl";
import { formatMoney } from "@/libs/utils/formatMoney";
import { normalizeTransferNote } from "@/libs/utils/vietQr";
import ReceiverCard from "@/components/features/scan-pay/components/receiver-card";
import { useScanPayContext } from "@/components/features/scan-pay/context";
import { copyText } from "@/components/features/scan-pay/utils";

/**
 * Bước 3: đã ghi chi tiêu, web đã chuyển sang app ngân hàng.
 * Quay lại web (app không tự điền, hoặc app không mở được) thì có nút copy từng thông tin và mở lại app.
 */
export default function PaymentDone() {
    const { qr, receiverBank, result, openBankApp, reset } = useScanPayContext();
    const { notification } = useAppFeedback();
    if (!qr || !result) return null;

    const transferNote = normalizeTransferNote(result.note);
    const copyRows = [
        { label: "Số tài khoản", value: qr.accountNumber },
        { label: "Ngân hàng", value: receiverBank?.shortName ?? qr.bin, display: receiverBank?.shortName ?? qr.bin },
        { label: "Số tiền", value: String(result.amount), display: formatMoney(result.amount) },
        ...(transferNote ? [{ label: "Nội dung", value: transferNote }] : []),
    ];

    const handleCopy = async (label: string, value: string) => {
        const ok = await copyText(value);
        if (ok) notification.success({ title: `Đã copy ${label.toLowerCase()}`, duration: 1500 });
        else notification.error({ title: "Trình duyệt không cho copy, hãy chép tay" });
    };

    return (
        <div className="mx-auto flex w-full max-w-md flex-col gap-4">
            <div className="flex flex-col items-center gap-2 pt-2 text-center">
                <CircleCheck className="size-10 text-money-in" />
                <p className="text-sm text-muted-foreground">Đã ghi chi tiêu</p>
                <Money value={result.amount} className="text-2xl font-semibold" />
                {result.app ? (
                    <p className="text-sm text-muted-foreground">
                        {result.autofill
                            ? `Xác nhận chuyển khoản trong ${result.app.appName}.`
                            : result.accountCopied
                              ? `Đã copy số tài khoản: mở ${result.app.appName}, dán vào lệnh chuyển.`
                              : `Mở ${result.app.appName} và nhập thông tin bên dưới.`}
                    </p>
                ) : null}
            </div>

            <ReceiverCard />

            {/* App không tự điền: copy từng thông tin để dán vào app */}
            {!result.autofill ? (
                <ul className="divide-y rounded-lg border bg-card">
                    {copyRows.map((row) => (
                        <li key={row.label} className="flex items-center gap-3 px-3 py-2">
                            <div className="min-w-0 flex-1">
                                <p className="text-xs text-muted-foreground">{row.label}</p>
                                <p className="truncate text-sm font-medium tabular-nums">{row.display ?? row.value}</p>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Copy ${row.label.toLowerCase()}`}
                                onClick={() => void handleCopy(row.label, row.value)}
                            >
                                <Copy />
                            </Button>
                        </li>
                    ))}
                </ul>
            ) : null}

            <div className="flex flex-col gap-2">
                {result.deeplink && result.app ? (
                    <Button size="lg" onClick={openBankApp}>
                        <ExternalLink data-icon="inline-start" />
                        Mở {result.app.appName}
                    </Button>
                ) : null}
                <Button variant="outline" size="lg" onClick={reset}>
                    <ScanQrCode data-icon="inline-start" />
                    Quét mã khác
                </Button>
                <Button variant="ghost" asChild>
                    <Link href={buildTransactionsUrl("expense")}>Xem chi tiêu đã ghi</Link>
                </Button>
            </div>
            <p className="text-center text-xs text-muted-foreground">
                Hủy chuyển khoản trong app thì xóa khoản chi này ở trang{" "}
                <Link href={MENU_KEY.TRANSACTIONS} className="underline">
                    Giao dịch
                </Link>
                .
            </p>
        </div>
    );
}
