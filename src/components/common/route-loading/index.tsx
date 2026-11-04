import { Skeleton } from "@/components/shadcn/ui/skeleton";
import { cn } from "@/libs/shadcn/utils";

/**
 * Skeleton theo bố cục trang khi chuyển route / chờ Suspense (plan 12, phương án B).
 * Nằm trong layout có sidebar nên chỉ vẽ vùng nội dung, không chiếm cả màn hình.
 */
export type RouteLoadingVariant = "dashboard" | "list" | "form";

function Bone({ className }: { className?: string }) {
    return <Skeleton className={cn("skeleton-shimmer animate-none", className)} />;
}

function Card({ className, children }: { className?: string; children: React.ReactNode }) {
    return (
        <div className={cn("flex flex-col gap-2.5 rounded-xl border border-border bg-card p-4", className)}>
            {children}
        </div>
    );
}

function ListRows({ count }: { count: number }) {
    return (
        <>
            {Array.from({ length: count }, (_, i) => (
                <div key={i} className="flex items-center gap-2.5">
                    <Bone className="size-8 shrink-0 rounded-full" />
                    <div className="flex flex-1 flex-col gap-1.5">
                        <Bone className={cn("h-3", i % 2 ? "w-3/5" : "w-3/4")} />
                        <Bone className="h-2.5 w-2/5" />
                    </div>
                    <Bone className="h-3 w-16" />
                </div>
            ))}
        </>
    );
}

const CHART_BARS = ["h-[40%]", "h-[70%]", "h-[55%]", "h-[90%]", "h-[60%]", "h-[75%]", "h-[45%]"];

function DashboardSkeleton() {
    return (
        <>
            <Card>
                <Bone className="h-3 w-28" />
                <Bone className="h-8 w-56 max-w-full" />
                <Bone className="h-2 w-full rounded-full" />
            </Card>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {["w-3/5", "w-1/2", "w-2/5"].map((w, i) => (
                    <Card key={w} className={i === 2 ? "hidden md:flex" : undefined}>
                        <Bone className={cn("h-3", w)} />
                        <Bone className="h-5 w-4/5" />
                    </Card>
                ))}
            </div>
            <div className="grid gap-3 md:grid-cols-[1.6fr_1fr]">
                <Card className="hidden md:flex">
                    <Bone className="h-3 w-36" />
                    <div className="flex h-32 items-end gap-2 pt-2">
                        {CHART_BARS.map((h, i) => (
                            <Bone key={i} className={cn("flex-1 rounded-b-sm rounded-t-md", h)} />
                        ))}
                    </div>
                </Card>
                <Card>
                    <Bone className="h-3 w-32" />
                    <ListRows count={3} />
                </Card>
            </div>
        </>
    );
}

function ListSkeleton() {
    return (
        <>
            <div className="flex gap-2">
                <Bone className="h-9 flex-1 md:max-w-xs" />
                <Bone className="h-9 w-24" />
            </div>
            <Card>
                <Bone className="h-3 w-24" />
                <ListRows count={4} />
            </Card>
            <Card>
                <Bone className="h-3 w-20" />
                <ListRows count={3} />
            </Card>
        </>
    );
}

function FormSkeleton() {
    return (
        <>
            {[3, 2].map((rows, i) => (
                <Card key={i}>
                    <Bone className="h-4 w-40" />
                    <Bone className="h-3 w-3/4" />
                    {Array.from({ length: rows }, (_, j) => (
                        <div key={j} className="flex flex-col gap-1.5 pt-1">
                            <Bone className="h-3 w-24" />
                            <Bone className="h-9 w-full" />
                        </div>
                    ))}
                    <Bone className="mt-1 h-9 w-28 self-end" />
                </Card>
            ))}
        </>
    );
}

const VARIANTS: Record<RouteLoadingVariant, () => React.ReactNode> = {
    dashboard: DashboardSkeleton,
    list: ListSkeleton,
    form: FormSkeleton,
};

export default function RouteLoading({ variant = "list" }: { variant?: RouteLoadingVariant }) {
    const Body = VARIANTS[variant];
    return (
        <div role="status" aria-live="polite" aria-busy="true" className="boot-delay flex flex-col gap-3">
            <span className="sr-only">Đang tải</span>
            <Bone className="h-6 w-44" />
            <Body />
        </div>
    );
}
