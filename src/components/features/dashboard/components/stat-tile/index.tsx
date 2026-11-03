import { cn } from "@/libs/shadcn/utils";

interface IStatTileProps {
    icon: React.ReactNode;
    label: string;
    value: React.ReactNode;
    description?: React.ReactNode;
    valueClassName?: string;
    highlight?: boolean;
}

export default function StatTile({
    icon,
    label,
    value,
    description,
    valueClassName,
    highlight,
}: IStatTileProps) {
    return (
        <div
            className={cn(
                "flex min-w-0 flex-col gap-1 rounded-xl border bg-card p-3 sm:p-4",
                highlight
                    ? "border-primary/40 bg-linear-to-br from-primary/15 to-transparent"
                    : "border-border",
            )}
        >
            <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">{label}</span>
                {icon}
            </div>
            <div
                className={cn(
                    "money-value text-base font-bold tracking-tight wrap-break-word tabular-nums sm:text-xl",
                    valueClassName,
                )}
            >
                {value}
            </div>
            {description ? (
                <div className="text-xs text-muted-foreground">{description}</div>
            ) : null}
        </div>
    );
}
