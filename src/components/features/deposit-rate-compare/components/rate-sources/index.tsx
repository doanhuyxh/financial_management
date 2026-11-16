"use client";

import { useState } from "react";
import dayjs from "dayjs";
import { ChevronDown, ExternalLink, Pencil, Plus, RefreshCw, Trash2, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/shadcn/ui/badge";
import { Button } from "@/components/shadcn/ui/button";
import { Spinner } from "@/components/shadcn/ui/spinner";
import BankLabel from "@/components/features/deposit-rate-compare/components/bank-label";
import { useDepositRateCompareContext } from "@/components/features/deposit-rate-compare/context";
import { ACCENT_BUTTON_CLASS } from "@/libs/constants/buttonStyles";
import { DepositRateOrigin, type IDepositRateTableData } from "@/libs/interfaces/depositRatesData";
import { cn } from "@/libs/shadcn/utils";
import { formatDate } from "@/libs/utils/formatDate";

/** Bảng tự lấy cũ hơn mức này coi là quá cũ (server tự làm mới sau 12 giờ). */
const STALE_HOURS = 24;

function isStale(table: IDepositRateTableData) {
    return table.tiers.length > 0 && dayjs().diff(dayjs(table.updatedAt), "hour") >= STALE_HOURS;
}

function AutoStatus({ table }: { table: IDepositRateTableData }) {
    const hasData = table.tiers.length > 0;
    return (
        <span className="flex flex-col items-end gap-0.5 text-xs text-muted-foreground">
            {hasData ? (
                <span className={cn(isStale(table) && "text-warn")}>
                    Cập nhật {formatDate(table.updatedAt, "DD/MM/YYYY HH:mm")}
                </span>
            ) : null}
            {table.lastError ? (
                <Badge variant="destructive" className="gap-1" title={table.lastError}>
                    <TriangleAlert />
                    {hasData ? "Lần lấy gần nhất lỗi, đang hiện số cũ" : "Chưa lấy được"}
                </Badge>
            ) : null}
        </span>
    );
}

/**
 * Nguồn số liệu thu gọn một dòng (lần cập nhật mới nhất, số nguồn, lỗi). Bấm "Chi tiết nguồn" mở danh sách
 * ngân hàng tự lấy (link, trạng thái) và bảng tự nhập (sửa/xóa); tự mở khi có nguồn lỗi hoặc quá cũ.
 */
export default function RateSources() {
    const { tables, isRefreshing, handleRefresh, handleOpenCreate, handleOpenEdit, handleDelete } =
        useDepositRateCompareContext();
    const autoTables = tables.filter((table) => table.origin === DepositRateOrigin.AUTO);
    const manualTables = tables.filter((table) => table.origin === DepositRateOrigin.MANUAL);
    const errorCount = autoTables.filter((table) => table.lastError).length;
    const staleCount = autoTables.filter((table) => !table.lastError && isStale(table)).length;
    const hasProblem = errorCount + staleCount > 0;
    const [expanded, setExpanded] = useState<boolean | null>(null);
    const isOpen = expanded ?? hasProblem;

    const latest = autoTables
        .filter((table) => table.tiers.length > 0)
        .reduce<string | null>(
            (max, table) => (!max || dayjs(table.updatedAt).isAfter(max) ? table.updatedAt : max),
            null,
        );
    const status = [
        `${autoTables.length} nguồn tự lấy`,
        errorCount ? `${errorCount} lỗi` : null,
        staleCount ? `${staleCount} quá ${STALE_HOURS} giờ chưa cập nhật` : null,
        !hasProblem ? "không có lỗi" : null,
        manualTables.length ? `${manualTables.length} bảng tự nhập` : null,
    ]
        .filter(Boolean)
        .join(" · ");

    return (
        <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
                {/* basis 16rem: mobile không đủ chỗ thì các nút xuống dòng, chữ không bị bóp mỗi từ một dòng */}
                <span className="flex min-w-0 flex-[1_1_16rem] items-start gap-2">
                    <span
                        aria-hidden
                        className={cn("mt-1.5 size-2 shrink-0 rounded-full", hasProblem ? "bg-warn" : "bg-money-in")}
                    />
                    <span className="min-w-0">
                        {latest ? (
                            <>
                                Cập nhật <b>{formatDate(latest, "DD/MM/YYYY HH:mm")}</b> ·{" "}
                            </>
                        ) : null}
                        {status} · tự làm mới sau 12 giờ
                    </span>
                </span>
                <span className="flex flex-wrap items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        aria-expanded={isOpen}
                        onClick={() => setExpanded(!isOpen)}
                    >
                        Chi tiết nguồn
                        <ChevronDown
                            data-icon="inline-end"
                            className={cn("transition-transform", isOpen && "rotate-180")}
                        />
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className={ACCENT_BUTTON_CLASS}
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                    >
                        {isRefreshing ? <Spinner data-icon="inline-start" /> : <RefreshCw data-icon="inline-start" />}
                        Lấy lại
                    </Button>
                    <Button size="sm" onClick={handleOpenCreate}>
                        <Plus data-icon="inline-start" />
                        Tự nhập
                    </Button>
                </span>
            </div>

            {isOpen ? (
                <div className="flex flex-col gap-4 border-t border-border pt-3">
                    <div className="flex flex-col gap-1">
                        <h3 className="text-sm font-semibold">Tự lấy từ trang ngân hàng</h3>
                        <ul className="flex flex-col divide-y">
                            {autoTables.map((table) => (
                                <li key={table._id} className="flex items-center justify-between gap-3 py-2">
                                    <span className="flex min-w-0 items-center gap-2">
                                        <BankLabel item={table} />
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

                    <div className="flex flex-col gap-1">
                        <h3 className="text-sm font-semibold">Bạn tự nhập</h3>
                        <p className="text-xs text-muted-foreground">
                            Ngân hàng chưa tự lấy được: nhập lãi suất theo biểu của ngân hàng để so sánh cùng.
                        </p>
                        {manualTables.length === 0 ? (
                            <p className="text-xs text-muted-foreground">Chưa có bảng nào.</p>
                        ) : (
                            <ul className="flex flex-col divide-y">
                                {manualTables.map((table) => (
                                    <li key={table._id} className="flex items-center justify-between gap-3 py-2">
                                        <BankLabel item={{ ...table, isManual: true }} />
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
                </div>
            ) : null}

            <p className="text-xs text-muted-foreground">
                Lấy từ biểu lãi suất công khai trên website chính thức. Lãi suất thực tế có thể khác theo chương
                trình, kênh gửi: kiểm tra lại trước khi gửi.
            </p>
        </section>
    );
}
