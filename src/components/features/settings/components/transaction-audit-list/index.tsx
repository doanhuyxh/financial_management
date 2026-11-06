"use client";

import { Bot, ChevronLeft, ChevronRight, History } from "lucide-react";
import ChoiceChips from "@/components/common/choice-chips";
import { Badge } from "@/components/shadcn/ui/badge";
import { Button } from "@/components/shadcn/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/shadcn/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/shadcn/ui/empty";
import { Spinner } from "@/components/shadcn/ui/spinner";
import { useSettingsContext } from "@/components/features/settings/context";
import { CARD_FEE_TYPE_LABELS, type CardFeeType } from "@/libs/interfaces/expensesData";
import {
    TRANSACTION_AUDIT_ACTION_LABELS,
    TRANSACTION_AUDIT_KIND_LABELS,
    TransactionAuditAction,
    TransactionAuditKind,
    type ITransactionAuditData,
    type ITransactionAuditSnapshot,
} from "@/libs/interfaces/transactionAuditsData";
import { formatDate } from "@/libs/utils/formatDate";
import { formatMoney } from "@/libs/utils/formatMoney";

type SnapshotField = keyof ITransactionAuditSnapshot;

const ALL_KINDS = "ALL";
const KIND_OPTIONS = [
    { value: ALL_KINDS, label: "Tất cả" },
    ...Object.values(TransactionAuditKind).map((kind) => ({
        value: kind,
        label: TRANSACTION_AUDIT_KIND_LABELS[kind],
    })),
];

/** Thứ tự hiển thị các trường */
const FIELDS: SnapshotField[] = [
    "amount",
    "feeAmount",
    "paymentAmount",
    "date",
    "categoryId",
    "sourceOfMoneyId",
    "fromSourceId",
    "toSourceId",
    "cardFeeType",
    "provider",
    "note",
];
const MONEY_FIELDS = new Set<SnapshotField>(["amount", "feeAmount", "paymentAmount"]);
const NAME_FIELDS = new Set<SnapshotField>([
    "categoryId",
    "sourceOfMoneyId",
    "fromSourceId",
    "toSourceId",
]);

function fieldLabel(field: SnapshotField, kind: TransactionAuditKind) {
    switch (field) {
        case "amount":
            return kind === TransactionAuditKind.CARD_ROLLOVER ? "Số tiền đáo" : "Số tiền";
        case "feeAmount":
            return "Phí";
        case "paymentAmount":
            return "Tự trả";
        case "date":
            return "Ngày";
        case "categoryId":
            return "Danh mục";
        case "sourceOfMoneyId":
            return kind === TransactionAuditKind.CARD_ROLLOVER ? "Thẻ" : "Nguồn";
        case "fromSourceId":
            return "Từ";
        case "toSourceId":
            return "Đến";
        case "cardFeeType":
            return "Loại phí";
        case "provider":
            return "Dịch vụ";
        case "note":
            return "Ghi chú";
    }
}

function formatValue(
    field: SnapshotField,
    snapshot: ITransactionAuditSnapshot | null,
    names: Record<string, string>,
) {
    const value = snapshot?.[field];
    if (value === undefined || value === "") return "—";
    if (MONEY_FIELDS.has(field)) return formatMoney(value as number);
    if (field === "date") return formatDate(value as string);
    if (NAME_FIELDS.has(field)) return names[value as string] || "(đã xóa)";
    if (field === "cardFeeType") return CARD_FEE_TYPE_LABELS[value as CardFeeType] ?? String(value);
    return String(value);
}

const ACTION_BADGE_VARIANT: Record<TransactionAuditAction, "default" | "secondary" | "destructive"> = {
    [TransactionAuditAction.CREATE]: "default",
    [TransactionAuditAction.UPDATE]: "secondary",
    [TransactionAuditAction.DELETE]: "destructive",
};

function AuditRow({ item, names }: { item: ITransactionAuditData; names: Record<string, string> }) {
    const isUpdate = item.action === TransactionAuditAction.UPDATE;
    // Tạo: giá trị nằm ở `after`; xóa: ở `before`
    const shown = item.action === TransactionAuditAction.CREATE ? item.after : item.before;
    const fields = FIELDS.filter((field) =>
        isUpdate
            ? formatValue(field, item.before, names) !== formatValue(field, item.after, names)
            : shown?.[field] !== undefined,
    );

    return (
        <li className="flex flex-col gap-1.5 border-b py-3 last:border-b-0">
            <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant={ACTION_BADGE_VARIANT[item.action] ?? "secondary"}>
                    {TRANSACTION_AUDIT_ACTION_LABELS[item.action] ?? item.action}
                </Badge>
                <span className="font-medium">{TRANSACTION_AUDIT_KIND_LABELS[item.kind]}</span>
                {item.via === "mcp" ? (
                    <Badge variant="outline" className="gap-1">
                        <Bot />
                        qua agent
                    </Badge>
                ) : null}
                <span className="ml-auto text-xs text-muted-foreground">
                    {formatDate(item.createdAt, "DD/MM/YYYY HH:mm")}
                </span>
            </div>
            {fields.length === 0 ? (
                <p className="text-xs text-muted-foreground">Không đổi trường nào</p>
            ) : (
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
                    {fields.map((field) => (
                        <div key={field} className="contents">
                            <dt className="text-muted-foreground">{fieldLabel(field, item.kind)}</dt>
                            <dd
                                className={
                                    MONEY_FIELDS.has(field) ? "money-value break-words" : "break-words"
                                }
                            >
                                {isUpdate ? (
                                    <>
                                        <span className="text-muted-foreground line-through">
                                            {formatValue(field, item.before, names)}
                                        </span>{" "}
                                        → {formatValue(field, item.after, names)}
                                    </>
                                ) : (
                                    formatValue(field, shown, names)
                                )}
                            </dd>
                        </div>
                    ))}
                </dl>
            )}
        </li>
    );
}

/** Lịch sử sửa/xóa giao dịch, mới nhất trước. */
export default function TransactionAuditList() {
    const {
        auditKind,
        auditItems,
        auditNames,
        auditPage,
        auditTotalPages,
        auditTotal,
        isAuditsLoading,
        handleAuditKindChange,
        handleAuditPageChange,
    } = useSettingsContext();

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <History className="size-4" />
                    Lịch sử sửa, xóa giao dịch
                </CardTitle>
                <CardDescription>
                    Ghi lại giá trị trước và sau mỗi lần sửa hoặc xóa chi tiêu, thu nhập, chuyển tiền,
                    đáo hạn; và các giao dịch do agent (MCP) tạo.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
                <ChoiceChips
                    options={KIND_OPTIONS}
                    value={auditKind || ALL_KINDS}
                    onChange={(value) =>
                        handleAuditKindChange(
                            value === ALL_KINDS ? "" : (value as TransactionAuditKind),
                        )
                    }
                />
                {isAuditsLoading ? (
                    <div className="flex justify-center py-6">
                        <Spinner />
                    </div>
                ) : auditItems.length === 0 ? (
                    <Empty>
                        <EmptyHeader>
                            <EmptyTitle>Chưa có lần sửa hoặc xóa nào</EmptyTitle>
                            <EmptyDescription>
                                Lịch sử bắt đầu ghi từ khi có tính năng này.
                            </EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                ) : (
                    <ul className="flex flex-col">
                        {auditItems.map((item) => (
                            <AuditRow key={item._id} item={item} names={auditNames} />
                        ))}
                    </ul>
                )}
                {auditTotalPages > 1 ? (
                    <div className="flex items-center justify-between gap-2 pt-1 text-xs text-muted-foreground">
                        <span>
                            {auditTotal} mục · trang {auditPage}/{auditTotalPages}
                        </span>
                        <div className="flex gap-1">
                            <Button
                                variant="outline"
                                size="icon-sm"
                                aria-label="Trang trước"
                                disabled={auditPage <= 1}
                                onClick={() => handleAuditPageChange(auditPage - 1)}
                            >
                                <ChevronLeft />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon-sm"
                                aria-label="Trang sau"
                                disabled={auditPage >= auditTotalPages}
                                onClick={() => handleAuditPageChange(auditPage + 1)}
                            >
                                <ChevronRight />
                            </Button>
                        </div>
                    </div>
                ) : null}
            </CardContent>
        </Card>
    );
}
