"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Input, QRCode, Typography } from "antd";
import { Download } from "lucide-react";
import ResponsiveModal from "@/components/common/responsive-modal";
import DebouncedNumberInput from "@/components/common/input/DebouncedNumberInput";
import { useSourcesOfMoneyContext } from "@/components/features/sources-of-money/context";
import { buildVietQrPayload, normalizeTransferNote } from "@/libs/utils/vietQr";
import { formatMoney } from "@/libs/utils/formatMoney";

function toAmount(value: string | number | null) {
    const num = Number(String(value ?? "").replace(/,/g, ""));
    return Number.isFinite(num) && num > 0 ? Math.round(num) : undefined;
}

export default function BankQrModal() {
    const { qrSource, closeQr } = useSourcesOfMoneyContext();
    const bankAccount = qrSource?.bankAccount;

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
                        <QRCode
                            value={payload}
                            size={240}
                            color="#000000"
                            bgColor="#ffffff"
                            bordered={false}
                            errorLevel="M"
                        />
                    </div>

                    <div className="text-center leading-6">
                        <div className="font-semibold">{bankAccount.bankName}</div>
                        <Typography.Text copyable={{ text: bankAccount.accountNumber }} strong>
                            {bankAccount.accountNumber}
                        </Typography.Text>
                        {bankAccount.accountName ? (
                            <div className="text-sm text-muted-foreground">
                                {bankAccount.accountName}
                            </div>
                        ) : null}
                        {amountValue ? (
                            <div className="mt-1 font-semibold text-green-600">
                                {formatMoney(amountValue)}
                            </div>
                        ) : null}
                    </div>

                    <div className="flex w-full flex-col gap-3">
                        <div>
                            <div className="mb-1 text-sm">Số tiền (tùy chọn)</div>
                            <DebouncedNumberInput
                                className="w-full!"
                                min={0}
                                step={1000}
                                delay={300}
                                placeholder="Để trống: người chuyển tự nhập"
                                value={amount}
                                onChange={setAmount}
                            />
                        </div>
                        <div>
                            <div className="mb-1 text-sm">Nội dung (tùy chọn)</div>
                            <Input
                                value={note}
                                onChange={(event) => setNote(event.target.value)}
                                maxLength={50}
                                placeholder="Ví dụ: Chuyen tien an trua"
                            />
                            {note && normalizeTransferNote(note) !== note ? (
                                <div className="mt-1 text-xs text-muted-foreground">
                                    Trong QR: {normalizeTransferNote(note) || "(trống)"}
                                </div>
                            ) : null}
                        </div>
                        <Button icon={<Download className="size-4" />} onClick={handleDownload}>
                            Tải ảnh QR
                        </Button>
                    </div>
                </div>
            ) : null}
        </ResponsiveModal>
    );
}
