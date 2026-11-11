"use client";

import type { ComponentType, CSSProperties, HTMLAttributes, ReactNode } from "react";
import EmptyState from "@/components/common/empty-state";
import LoadingOverlay from "@/components/common/loading-overlay";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/shadcn/ui/table";
import { cn } from "@/libs/shadcn/utils";

/** Cột của DataTable (thay `ColumnsType` của antd; không có sort/filter). */
export interface IDataTableColumn<T> {
    key: string;
    title?: ReactNode;
    /** Lấy giá trị ô từ bản ghi; không có thì `render` nhận `undefined` */
    dataIndex?: keyof T & string;
    render?: (value: unknown, record: T, index: number) => ReactNode;
    width?: number | string;
    align?: "left" | "center" | "right";
    /** Cột dính bên trái khi cuộn ngang */
    fixed?: "left";
    /** Chỉ hiện từ breakpoint `md` */
    responsive?: "md"[];
    className?: string;
    /** Class / colSpan từng ô (colSpan 0 = ô bị gộp, không render) */
    onCell?: (record: T, index: number) => { className?: string; colSpan?: number };
}

export interface IDataTableRowProps extends HTMLAttributes<HTMLTableRowElement> {
    "data-row-key": string;
}

export interface IDataTableProps<T> {
    columns: IDataTableColumn<T>[];
    dataSource: T[];
    rowKey: (keyof T & string) | ((record: T) => string);
    size?: "small" | "middle";
    loading?: boolean;
    showHeader?: boolean;
    emptyText?: ReactNode;
    rowClassName?: (record: T, index: number) => string | undefined;
    /** Hàng tùy biến (VD: hàng kéo-thả của SortableTable) */
    components?: { row?: ComponentType<IDataTableRowProps> };
    className?: string;
}

const CELL_PADDING = {
    small: "px-3 py-2",
    middle: "px-4 py-3",
};

const ALIGN_CLASS = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
};

function widthStyle(width: number | string | undefined): CSSProperties | undefined {
    if (width === undefined) return undefined;
    const value = typeof width === "number" ? `${width}px` : width;
    return { width: value, minWidth: typeof width === "number" ? value : undefined };
}

/** Bảng tĩnh theo định nghĩa cột (thay antd Table). Cuộn ngang khi tràn. */
export default function DataTable<T>({
    columns,
    dataSource,
    rowKey,
    size = "middle",
    loading = false,
    showHeader = true,
    emptyText,
    rowClassName,
    components,
    className,
}: IDataTableProps<T>) {
    const getKey = typeof rowKey === "function" ? rowKey : (record: T) => String(record[rowKey]);
    const Row = components?.row ?? TableRow;
    const padding = CELL_PADDING[size];

    const columnClass = (column: IDataTableColumn<T>) =>
        cn(
            padding,
            ALIGN_CLASS[column.align ?? "left"],
            column.fixed === "left" && "sticky left-0 z-10 bg-card",
            column.responsive?.includes("md") && "max-md:hidden",
            column.className,
        );

    return (
        <LoadingOverlay loading={loading} className={className}>
            <Table className={cn(size === "small" ? "text-sm" : "text-sm")}>
                {showHeader ? (
                    <TableHeader>
                        <TableRow className="hover:bg-transparent">
                            {columns.map((column) => (
                                <TableHead
                                    key={column.key}
                                    style={widthStyle(column.width)}
                                    className={cn(
                                        "h-auto bg-secondary text-xs font-semibold text-muted-foreground",
                                        columnClass(column),
                                        column.fixed === "left" && "bg-secondary",
                                    )}
                                >
                                    {column.title}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                ) : null}
                <TableBody>
                    {dataSource.length === 0 ? (
                        <TableRow className="hover:bg-transparent">
                            <TableCell colSpan={columns.length} className="p-0">
                                {emptyText ?? <EmptyState className="py-6" />}
                            </TableCell>
                        </TableRow>
                    ) : (
                        dataSource.map((record, index) => {
                            const key = getKey(record);
                            return (
                                <Row
                                    key={key}
                                    data-row-key={key}
                                    className={cn(
                                        "border-b transition-colors last:border-0 hover:bg-background",
                                        rowClassName?.(record, index),
                                    )}
                                >
                                    {columns.map((column) => {
                                        const cell = column.onCell?.(record, index);
                                        if (cell?.colSpan === 0) return null;
                                        const value =
                                            column.dataIndex !== undefined
                                                ? (record[column.dataIndex] as unknown)
                                                : undefined;
                                        return (
                                            <TableCell
                                                key={column.key}
                                                colSpan={cell?.colSpan}
                                                style={widthStyle(column.width)}
                                                className={cn(
                                                    "whitespace-normal",
                                                    columnClass(column),
                                                    cell?.className,
                                                )}
                                            >
                                                {column.render
                                                    ? column.render(value, record, index)
                                                    : (value as ReactNode)}
                                            </TableCell>
                                        );
                                    })}
                                </Row>
                            );
                        })
                    )}
                </TableBody>
            </Table>
        </LoadingOverlay>
    );
}
