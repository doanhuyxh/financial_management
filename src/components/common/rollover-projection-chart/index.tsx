"use client";

export interface IChartSeries {
    key: string;
    label: string;
    /** Biến CSS màu, VD "var(--debt)" */
    color: string;
    points: { x: number; y: number }[];
    dashed?: boolean;
}

export interface IChartMarker {
    x: number;
    y: number;
    label: string;
    color: string;
}

interface IRolloverProjectionChartProps {
    series: IChartSeries[];
    /** Đường ngang tham chiếu (VD số tiền gốc) */
    baseline?: { value: number; label: string };
    /** Đường dọc (VD "hôm nay") */
    divider?: { x: number; label: string };
    markers?: IChartMarker[];
    xLabels?: { x: number; label: string }[];
    className?: string;
}

const W = 560;
const H = 200;
const PAD = 28;

/** Biểu đồ đường SVG nhẹ cho mô phỏng/hành trình đáo hạn: dư nợ, phí tích lũy, đã tự trả. */
export default function RolloverProjectionChart({
    series,
    baseline,
    divider,
    markers = [],
    xLabels = [],
    className,
}: IRolloverProjectionChartProps) {
    const allPoints = series.flatMap((s) => s.points);
    if (allPoints.length === 0) return null;
    const maxX = Math.max(1, ...allPoints.map((p) => p.x));
    const maxY = Math.max(1, baseline?.value ?? 0, ...allPoints.map((p) => p.y));
    const X = (x: number) => PAD + (x / maxX) * (W - 2 * PAD);
    const Y = (y: number) => H - PAD - (y / maxY) * (H - 2 * PAD);
    const path = (points: { x: number; y: number }[]) =>
        points.map((p, i) => `${i ? "L" : "M"}${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join(" ");

    return (
        <div className={className}>
            <div className="mb-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                {series.filter((s) => s.label).map((s) => (
                    <span key={s.key} className="inline-flex items-center gap-1">
                        <i
                            className="inline-block h-0.5 w-3.5 rounded"
                            style={{
                                background: s.dashed ? "transparent" : s.color,
                                borderTop: s.dashed ? `2px dashed ${s.color}` : undefined,
                            }}
                        />
                        {s.label}
                    </span>
                ))}
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Biểu đồ đáo hạn">
                {baseline ? (
                    <>
                        <line x1={PAD} y1={Y(baseline.value)} x2={W - PAD} y2={Y(baseline.value)} stroke="var(--muted-foreground)" strokeDasharray="4 4" />
                        <text x={PAD} y={Y(baseline.value) - 4} fontSize="10" fill="var(--muted-foreground)">
                            {baseline.label}
                        </text>
                    </>
                ) : null}
                {divider ? (
                    <>
                        <line x1={X(divider.x)} y1={PAD} x2={X(divider.x)} y2={H - PAD} stroke="var(--border)" strokeDasharray="2 3" />
                        <text x={X(divider.x) + 3} y={PAD + 8} fontSize="9" fill="var(--muted-foreground)">
                            {divider.label}
                        </text>
                    </>
                ) : null}
                {series.map((s) =>
                    s.points.length > 0 ? (
                        <path key={s.key} d={path(s.points)} fill="none" stroke={s.color} strokeWidth="2" strokeDasharray={s.dashed ? "4 4" : undefined} />
                    ) : null,
                )}
                {markers.map((m) => (
                    <g key={`${m.x}-${m.label}`}>
                        <circle cx={X(m.x)} cy={Y(m.y)} r="4" fill={m.color} />
                        <text x={X(m.x) + 6} y={Y(m.y) + 4} fontSize="10" fill={m.color}>
                            {m.label}
                        </text>
                    </g>
                ))}
                {xLabels.map((l, i) => (
                    <text key={l.x} x={X(l.x)} y={H - 6} fontSize="9" fill="var(--muted-foreground)" textAnchor={i === xLabels.length - 1 ? "end" : "start"}>
                        {l.label}
                    </text>
                ))}
            </svg>
        </div>
    );
}
