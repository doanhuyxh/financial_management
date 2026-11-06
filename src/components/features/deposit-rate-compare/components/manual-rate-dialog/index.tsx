"use client";

import { useState } from "react";
import { Button } from "@/components/shadcn/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/shadcn/ui/dialog";
import { Input } from "@/components/shadcn/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/shadcn/ui/select";
import { Spinner } from "@/components/shadcn/ui/spinner";
import { useDepositRateCompareContext } from "@/components/features/deposit-rate-compare/context";
import {
    DEPOSIT_PRODUCT_MAX_LENGTH,
    DEPOSIT_TERMS,
    MAX_DEPOSIT_RATE_PERCENT,
    type IDepositRateTableData,
} from "@/libs/interfaces/depositRatesData";

type RateInputs = Record<string, string>;

function initialRates(table: IDepositRateTableData | null): RateInputs {
    const rates = table?.tiers[0]?.rates ?? {};
    return Object.fromEntries(
        DEPOSIT_TERMS.map((term) => {
            const rate = rates[String(term)];
            return [String(term), rate == null ? "" : String(rate).replace(".", ",")];
        }),
    );
}

const parseRate = (text: string) => Number(text.trim().replace(",", "."));

/** Nội dung form; mount lại theo bảng đang sửa để lấy giá trị ban đầu. */
function ManualRateForm({ table }: { table: IDepositRateTableData | null }) {
    const { banks, isSaving, handleSubmit, handleCloseEditor } = useDepositRateCompareContext();
    const [bankCode, setBankCode] = useState(table?.bankCode ?? "");
    const [product, setProduct] = useState(table?.product ?? "");
    const [rates, setRates] = useState<RateInputs>(() => initialRates(table));
    const [error, setError] = useState("");

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        const bank = banks.find((item) => item.code === bankCode);
        const bankName = bank?.shortName || bank?.name || table?.bankName || "";
        if (!bankCode || !bankName) return setError("Chọn ngân hàng");

        const entries = Object.entries(rates).filter(([, text]) => text.trim() !== "");
        const invalid = entries.find(([, text]) => {
            const rate = parseRate(text);
            return !Number.isFinite(rate) || rate <= 0 || rate > MAX_DEPOSIT_RATE_PERCENT;
        });
        if (invalid) {
            return setError(`Lãi suất kỳ hạn ${invalid[0]} tháng phải từ 0 đến ${MAX_DEPOSIT_RATE_PERCENT}%/năm`);
        }
        if (entries.length === 0) return setError("Nhập lãi suất cho ít nhất một kỳ hạn");

        setError("");
        await handleSubmit({
            bankCode,
            bankName,
            product: product.trim(),
            rates: entries.map(([term, text]) => ({ termMonths: Number(term), rate: parseRate(text) })),
        });
    };

    return (
        <form onSubmit={submit} className="flex flex-col gap-4">
            <DialogHeader>
                <DialogTitle>{table ? "Sửa lãi suất" : "Thêm lãi suất"}</DialogTitle>
                <DialogDescription>
                    Nhập theo biểu lãi suất tiết kiệm (%/năm, lãi cuối kỳ) của ngân hàng. Bỏ trống kỳ hạn không có.
                </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm">
                    <span className="text-muted-foreground">Ngân hàng</span>
                    <Select value={bankCode} onValueChange={setBankCode}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Chọn ngân hàng" />
                        </SelectTrigger>
                        <SelectContent className="max-h-72">
                            {banks.map((bank) => (
                                <SelectItem key={bank.code} value={bank.code}>
                                    {bank.shortName || bank.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </label>
                <label className="flex flex-col gap-1 text-sm">
                    <span className="text-muted-foreground">Sản phẩm / kênh gửi</span>
                    <Input
                        value={product}
                        maxLength={DEPOSIT_PRODUCT_MAX_LENGTH}
                        placeholder="VD: Gửi online"
                        onChange={(event) => setProduct(event.target.value)}
                    />
                </label>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {DEPOSIT_TERMS.map((term) => (
                    <label key={term} className="flex flex-col gap-1 text-xs">
                        <span className="text-muted-foreground">{term} tháng</span>
                        <Input
                            inputMode="decimal"
                            placeholder="%"
                            className="tabular-nums"
                            value={rates[String(term)]}
                            onChange={(event) =>
                                setRates((current) => ({
                                    ...current,
                                    [String(term)]: event.target.value.replace(/[^\d.,]/g, ""),
                                }))
                            }
                        />
                    </label>
                ))}
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseEditor}>
                    Hủy
                </Button>
                <Button type="submit" disabled={isSaving}>
                    {isSaving ? <Spinner data-icon="inline-start" /> : null}
                    Lưu
                </Button>
            </DialogFooter>
        </form>
    );
}

/** Thêm/sửa bảng lãi suất tự nhập. */
export default function ManualRateDialog() {
    const { editor, handleCloseEditor } = useDepositRateCompareContext();
    return (
        <Dialog open={editor != null} onOpenChange={(open) => (!open ? handleCloseEditor() : undefined)}>
            <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
                {editor ? <ManualRateForm key={editor.table?._id ?? "new"} table={editor.table} /> : null}
            </DialogContent>
        </Dialog>
    );
}
