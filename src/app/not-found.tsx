"use client";

import Link from "next/link";

export default function NotFoundPage() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground">
            <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-border to-transparent" />
                <div className="flex flex-col gap-6 p-6 text-center sm:p-8">
                    <div className="space-y-2">
                        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
                            404
                        </p>
                        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                            Không tìm thấy trang
                        </h1>
                        <p className="text-sm leading-6 text-muted-foreground sm:text-base">
                            Trang bạn đang mở không tồn tại, đã bị xóa hoặc đã được chuyển sang địa chỉ khác.
                        </p>
                    </div>

                    <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                        Bạn có thể quay lại trang chủ để tiếp tục.
                    </div>

                    <div className="flex justify-center">
                        <Link
                            href="/"
                            className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                        >
                            Quay về trang chủ
                        </Link>
                    </div>
                </div>
            </div>
        </main>
    );
}