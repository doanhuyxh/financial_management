import { LoaderCircleIcon } from "lucide-react"

export default function LoadingComponent() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
            <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-sm">
                <LoaderCircleIcon className="size-4 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Loading app...</span>
            </div>
        </main>
    )
}
