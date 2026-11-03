import { formatMoney, formatPercent } from "@/libs/utils/formatMoney";

export interface IBarRow {
    key: string;
    name: string;
    total: number;
    color: string;
}

/** Danh sách thanh ngang: tên · số tiền · % trên `total`; thanh dài nhất = dòng lớn nhất. */
export default function BarList({ rows, total }: { rows: IBarRow[]; total: number }) {
    const max = Math.max(...rows.map((row) => row.total), 1);
    return (
        <ul className="flex flex-col gap-3">
            {rows.map((row) => (
                <li key={row.key}>
                    <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                        <span className="min-w-0 truncate font-medium">{row.name}</span>
                        <span className="money-value shrink-0 tabular-nums">
                            {formatMoney(row.total)}
                            <span className="text-muted-foreground">
                                {" · "}
                                {formatPercent(total ? row.total / total : 0)}
                            </span>
                        </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                            className="h-full rounded-full"
                            style={{
                                width: `${Math.max(2, (row.total / max) * 100)}%`,
                                backgroundColor: row.color,
                            }}
                        />
                    </div>
                </li>
            ))}
        </ul>
    );
}
