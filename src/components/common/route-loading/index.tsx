export default function RouteLoading() {
    return (
        <div className="flex flex-col gap-3" aria-busy="true" aria-label="Đang tải">
            <div className="h-10 w-full max-w-sm animate-pulse rounded-lg bg-muted" />
            <div className="h-40 animate-pulse rounded-xl bg-muted" />
            <div className="h-40 animate-pulse rounded-xl bg-muted" />
        </div>
    );
}
