"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Scale } from "lucide-react";
import { Button } from "@/components/shadcn/ui/button";
import { Spinner } from "@/components/shadcn/ui/spinner";
import {
    useApplySourceReconcile,
    useGetSourceReconcile,
} from "@/libs/hooks/customHooks/useSourcesOfMoney";
import { useAppFeedback } from "@/libs/hooks/useAppFeedback";
import {
    ReconcileBlockReason,
    type IBalanceReconcileData,
} from "@/libs/interfaces/balanceReconcileData";
import { formatMoney } from "@/libs/utils/formatMoney";

const BLOCK_REASON_TEXT: Record<ReconcileBlockReason, string> = {
    [ReconcileBlockReason.LEDGER_INCOMPLETE]:
        "Nguồn này tạo trước khi app ghi đủ số dư ban đầu, nên chưa sửa tự động được. Cần chạy script bổ sung số dư ban đầu trước.",
    [ReconcileBlockReason.LEDGER_OUT_OF_RANGE]:
        "Số theo sổ âm hoặc vượt hạn mức. Hãy kiểm tra lại các giao dịch của nguồn này.",
    [ReconcileBlockReason.ARCHIVED]: "Nguồn tiền đã bị xóa, không sửa số được.",
};

interface ISourceReconcilePanelProps {
    sourceId: string;
    isCreditCard: boolean;
}

function ReconcileRows({ data, label }: { data: IBalanceReconcileData; label: string }) {
    return (
        <dl className="grid grid-cols-3 gap-2 text-xs">
            <div>
                <dt className="text-muted-foreground">{label} đang lưu</dt>
                <dd className="money-value font-medium">{formatMoney(data.stored)}</dd>
            </div>
            <div>
                <dt className="text-muted-foreground">Theo sổ</dt>
                <dd className="money-value font-medium">{formatMoney(data.ledger)}</dd>
            </div>
            <div>
                <dt className="text-muted-foreground">Lệch</dt>
                <dd className="money-value font-semibold text-warn">
                    {data.diff > 0 ? "+" : ""}
                    {formatMoney(data.diff)}
                </dd>
            </div>
        </dl>
    );
}

/**
 * Đối soát: so số dư/dư nợ đang lưu với tổng giao dịch + điều chỉnh (sổ cái).
 * Lệch thì cho "Sửa về theo sổ" (sổ cái là sự thật). Xem business/sources-of-money.md.
 */
export default function SourceReconcilePanel({ sourceId, isCreditCard }: ISourceReconcilePanelProps) {
    const [checking, setChecking] = useState(false);
    const { notification, modal } = useAppFeedback();
    const { data, isFetching, refetch } = useGetSourceReconcile(sourceId, checking);
    const { mutateAsync: applyReconcile } = useApplySourceReconcile();
    const result = data?.data;
    const label = isCreditCard ? "Dư nợ" : "Số dư";

    if (!checking) {
        return (
            <Button variant="outline" size="sm" className="self-start" onClick={() => setChecking(true)}>
                <Scale data-icon="inline-start" />
                Đối soát {label.toLowerCase()}
            </Button>
        );
    }

    if (!result) {
        return (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Spinner />
                Đang tính tổng giao dịch…
            </div>
        );
    }

    const handleApply = () => {
        modal.confirm({
            title: `Sửa ${label.toLowerCase()} về theo sổ?`,
            content: `${label} sẽ đổi từ ${formatMoney(result.stored)} thành ${formatMoney(result.ledger)} cho khớp tổng giao dịch. Không tạo giao dịch mới.`,
            okText: "Sửa về theo sổ",
            onOk: async () => {
                try {
                    await applyReconcile({
                        sourceId,
                        body: { expectedStored: result.stored, expectedLedger: result.ledger },
                    });
                    notification.success({ title: `Đã sửa ${label.toLowerCase()} về theo sổ` });
                } catch (error: unknown) {
                    const message =
                        (error as { message?: string })?.message ?? "Đối soát thất bại";
                    notification.error({ title: message });
                    void refetch();
                }
            },
        });
    };

    return (
        <div className="flex flex-col gap-2 rounded-md border px-3 py-2">
            {result.diff === 0 ? (
                <p className="flex items-center gap-1.5 text-xs text-money-in">
                    <CheckCircle2 className="size-4" />
                    Khớp sổ: {label.toLowerCase()} đang lưu bằng tổng giao dịch và điều chỉnh.
                </p>
            ) : (
                <>
                    <p className="flex items-center gap-1.5 text-xs font-medium text-warn">
                        <AlertTriangle className="size-4" />
                        {label} đang lưu lệch so với tổng giao dịch
                    </p>
                    <ReconcileRows data={result} label={label} />
                    {result.canApply ? (
                        <Button size="sm" className="self-start" onClick={handleApply}>
                            Sửa về theo sổ
                        </Button>
                    ) : result.blockReason ? (
                        <p className="text-xs text-muted-foreground">
                            {BLOCK_REASON_TEXT[result.blockReason]}
                        </p>
                    ) : null}
                </>
            )}
            {result.openIssues > 0 ? (
                <p className="text-xs text-muted-foreground">
                    Có {result.openIssues} lần hoàn tác lỗi chưa xử lý trên nguồn này.
                </p>
            ) : null}
            <Button
                variant="ghost"
                size="xs"
                className="self-start"
                disabled={isFetching}
                onClick={() => void refetch()}
            >
                {isFetching ? <Spinner data-icon="inline-start" /> : null}
                Kiểm tra lại
            </Button>
        </div>
    );
}
