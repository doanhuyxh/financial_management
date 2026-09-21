"use client";

import { AlertTriangle } from "lucide-react";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error;
    reset: () => void;
}) {
    return (
        <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground">
            <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-border to-transparent" />
                <div className="flex flex-col gap-6 p-6 sm:p-8">
                    <div className="flex items-start gap-4">
                        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-border bg-muted">
                            <AlertTriangle className="size-6 text-muted-foreground" />
                        </div>
                        <div className="space-y-2">
                            <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
                                Application error
                            </p>
                            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                                Có lỗi xảy ra khi tải trang
                            </h2>
                            <p className="text-sm leading-6 text-muted-foreground sm:text-base">
                                {error.message || "Vui lòng thử lại để tiếp tục."}
                            </p>
                        </div>
                    </div>

                    <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                        Nếu lỗi vẫn còn, hãy tải lại trang hoặc quay về màn hình trước đó.
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row justify-between">
                        <button
                            onClick={() => reset()}
                            className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                        >
                            Thử lại
                        </button>
                        <button
                            type="button"
                            onClick={() => window.location.assign("/")}
                            className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                        >
                            Về trang chủ
                        </button>
                    </div>
                </div>
            </div>
        </main>
    );
}