interface IMiniStatProps {
    icon: React.ReactNode;
    label: string;
    value: React.ReactNode;
}

export default function MiniStat({ icon, label, value }: IMiniStatProps) {
    return (
        <div className="flex min-w-0 items-center gap-2">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                {icon}
            </span>
            <div className="min-w-0 leading-tight">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="truncate text-sm font-semibold tabular-nums">{value}</p>
            </div>
        </div>
    );
}
