"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Copy, Download } from "lucide-react";
import FormField from "@/components/common/form-field";
import DebouncedNumberInput from "@/components/common/input/DebouncedNumberInput";
import ResponsiveModal from "@/components/common/responsive-modal";
import { Button } from "@/components/shadcn/ui/button";
import { Input } from "@/components/shadcn/ui/input";
import { useSourcesOfMoneyContext } from "@/components/features/sources-of-money/context";
import { useCommon } from "@/libs/hooks/useCommon";
import { buildVietQrPayload, normalizeTransferNote } from "@/libs/utils/vietQr";
import { formatMoney } from "@/libs/utils/formatMoney";

function toAmount(value: string | number | null) {
    const num = Number(String(value ?? "").replace(/,/g, ""));
    return Number.isFinite(num) && num > 0 ? Math.round(num) : undefined;
}

export default function BankQrModal() {
    const { qrSource, closeQr } = useSourcesOfMoneyContext();
    const { copiedToClipboard } = useCommon();
    const bankAccount = qrSource?.bankAccount;
    const noteId = useId();

    const [amount, setAmount] = useState<string | number | null>(null);
    const [note, setNote] = useState("");
    const qrRef = useRef<HTMLDivElement>(null);

    // Mỗi lần mở cho nguồn khác thì bắt đầu lại từ QR tĩnh
    useEffect(() => {
        setAmount(null);
        setNote("");
    }, [qrSource?._id]);

    const amountValue = toAmount(amount);
    const payload = useMemo(
        () =>
            bankAccount
                ? buildVietQrPayload({
                      bin: bankAccount.bin,
                      accountNumber: bankAccount.accountNumber,
                      amount: amountValue,
                      note,
                  })
                : "",
        [bankAccount, amountValue, note],
    );

    const handleDownload = () => {
        const canvas = qrRef.current?.querySelector("canvas");
        if (!canvas || !bankAccount) return;
        const link = document.createElement("a");
        link.download = `vietqr-${bankAccount.bankName}-${bankAccount.accountNumber}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
    };

    return (
        <ResponsiveModal
            title={qrSource ? `Mã QR nhận tiền: ${qrSource.name}` : "Mã QR nhận tiền"}
            open={Boolean(qrSource && bankAccount)}
            onCancel={closeQr}
            footer={null}
            destroyOnHidden
            width={420}
        >
            {bankAccount ? (
                <div className="flex flex-col items-center gap-4">
                    {/* QR luôn nền trắng để camera quét được cả khi app đang ở dark mode */}
                    <div ref={qrRef} className="rounded-lg bg-white p-2">
                        <QRCodeCanvas
                            value={payload}
                            size={240}
                            level="M"
                            bgColor="#ffffff"
                            fgColor="#000000"
                        />
                    </div>

                    <div className="text-center leading-6">
                        <div className="font-semibold">{bankAccount.bankName}</div>
                        <div className="flex items-center justify-center gap-1 font-semibold">
                            <span>{bankAccount.accountNumber}</span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                aria-label="Sao chép số tài khoản"
                                title="Sao chép số tài khoản"
                                onClick={() => copiedToClipboard(bankAccount.accountNumber)}
                            >
                                <Copy className="size-3.5" />
                            </Button>
                        </div>
                        {bankAccount.accountName ? (
                            <div className="text-sm text-muted-foreground">
                                {bankAccount.accountName}
                            </div>
                        ) : null}
                        {amountValue ? (
                            <div className="mt-1 font-semibold text-money-in">
                                {formatMoney(amountValue)}
                            </div>
                        ) : null}
                    </div>

                    <div className="flex w-full flex-col gap-3">
                        <FormField label="Số tiền (tùy chọn)">
                            <DebouncedNumberInput
                                min={0}
                                precision={0}
                                delay={300}
                                placeholder="Để trống: người chuyển tự nhập"
                                value={amount}
                                onChange={setAmount}
                            />
                        </FormField>
                        <FormField
                            label="Nội dung (tùy chọn)"
                            htmlFor={noteId}
                            extra={
                                note && normalizeTransferNote(note) !== note
                                    ? `Trong QR: ${normalizeTransferNote(note) || "(trống)"}`
                                    : undefined
                            }
                        >
                            <Input
                                id={noteId}
                                value={note}
                                onChange={(event) => setNote(event.target.value)}
                                maxLength={50}
                                placeholder="Ví dụ: Chuyen tien an trua"
                            />
                        </FormField>
                        <Button type="button" variant="outline" onClick={handleDownload}>
                            <Download data-icon="inline-start" className="size-4" />
                            Tải ảnh QR
                        </Button>
                    </div>
                </div>
            ) : null}
        </ResponsiveModal>
    );
}
