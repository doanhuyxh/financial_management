"use client";

import { ExternalLink, Pencil, Plus, RefreshCw, Trash2, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/shadcn/ui/badge";
import { Button } from "@/components/shadcn/ui/button";
import { Spinner } from "@/components/shadcn/ui/spinner";
import BankLabel from "@/components/features/deposit-rate-compare/components/bank-label";
import { useDepositRateCompareContext } from "@/components/features/deposit-rate-compare/context";
import { DepositRateOrigin, type IDepositRateTableData } from "@/libs/interfaces/depositRatesData";
import { formatDate } from "@/libs/utils/formatDate";

function AutoStatus({ table }: { table: IDepositRateTableData }) {
    const hasData = table.tiers.length > 0;
    return (
        <span className="flex flex-col items-end gap-0.5 text-xs text-muted-foreground">
            {hasData ? <span>Cập nhật {formatDate(table.updatedAt, "DD/MM/YYYY HH:mm")}</span> : null}
            {table.lastError ? (
                <Badge variant="destructive" className="gap-1" title={table.lastError}>
                    <TriangleAlert />
                    {hasData ? "Lần lấy gần nhất lỗi, đang hiện số cũ" : "Chưa lấy được"}
                </Badge>
            ) : null}
        </span>
    );
}

/** Nguồn số liệu: ngân hàng tự lấy (kèm link, trạng thái, nút lấy lại) và bảng tự nhập (sửa/xóa). */
export default function RateSources() {
    const { tables, isRefreshing, handleRefresh, handleOpenCreate, handleOpenEdit, handleDelete } =
        useDepositRateCompareContext();
    const autoTables = tables.filter((table) => table.origin === DepositRateOrigin.AUTO);
    const manualTables = tables.filter((table) => table.origin === DepositRateOrigin.MANUAL);

    return (
        <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
            <div className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <h2 className="text-base font-semibold">Tự lấy từ trang ngân hàng</h2>
                        <p className="text-xs text-muted-foreground">
                            Lấy từ biểu lãi suất công khai trên website chính thức, tự làm mới sau 12 giờ. Lãi
                            suất thực tế có thể khác theo chương trình, kênh gửi: kiểm tra lại trước khi gửi.
                        </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
                        {isRefreshing ? <Spinner data-icon="inline-start" /> : <RefreshCw data-icon="inline-start" />}
                        Lấy lại
                    </Button>
                </div>
                <ul className="flex flex-col divide-y">
                    {autoTables.map((table) => (
                        <li key={table._id} className="flex items-center justify-between gap-3 py-2">
                            <span className="flex min-w-0 items-center gap-2">
                                <BankLabel table={table} />
                                {table.sourceUrl ? (
                                    <a
                                        href={table.sourceUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="shrink-0 text-muted-foreground hover:text-foreground"
                                        aria-label={`Mở trang lãi suất ${table.bankName}`}
                                        title="Mở trang nguồn"
                                    >
                                        <ExternalLink className="size-3.5" />
                                    </a>
                                ) : null}
                            </span>
                            <AutoStatus table={table} />
                        </li>
                    ))}
                </ul>
            </div>

            <div className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <h2 className="text-base font-semibold">Bạn tự nhập</h2>
                        <p className="text-xs text-muted-foreground">
                            Ngân hàng chưa tự lấy được: nhập lãi suất theo biểu của ngân hàng để so sánh cùng.
                        </p>
                    </div>
                    <Button size="sm" onClick={handleOpenCreate}>
                        <Plus data-icon="inline-start" />
                        Thêm
                    </Button>
                </div>
                {manualTables.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Chưa có bảng nào.</p>
                ) : (
                    <ul className="flex flex-col divide-y">
                        {manualTables.map((table) => (
                            <li key={table._id} className="flex items-center justify-between gap-3 py-2">
                                <BankLabel table={table} />
                                <span className="flex shrink-0 items-center gap-1">
                                    <span className="mr-1 hidden text-xs text-muted-foreground sm:inline">
                                        Sửa {formatDate(table.updatedAt)}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        aria-label="Sửa"
                                        onClick={() => handleOpenEdit(table)}
                                    >
                                        <Pencil />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        aria-label="Xóa"
                                        onClick={() => handleDelete(table)}
                                    >
                                        <Trash2 className="text-destructive" />
                                    </Button>
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </section>
    );
}
