/**
 * Splash "Ví tiền" khi mở app (plan 12, phương án A). Đây là HTML tĩnh server trả về trước khi JS chạy
 * (xem providers/client-app), nên chỉ dùng CSS + SVG inline: không dùng lucide/motion ở đây.
 */
export default function LoadingComponent() {
    return (
        <main className="flex min-h-dvh items-center justify-center bg-background px-4 text-foreground">
            <div
                role="status"
                aria-live="polite"
                className="boot-delay flex flex-col items-center gap-3.5 text-center"
            >
                <div className="boot-logo relative grid size-18 place-items-center rounded-2xl bg-primary">
                    <span
                        aria-hidden="true"
                        className="boot-coin absolute -top-6.5 left-1/2 -ml-2 size-4 rounded-full border-2 border-white bg-[#f5b301] shadow-sm"
                    />
                    <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#fff"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="size-9.5"
                    >
                        <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
                        <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
                    </svg>
                </div>
                <p className="mt-2.5 text-lg font-semibold">Money Manager</p>
                <p className="text-sm text-muted-foreground">Đang mở sổ của bạn…</p>
                <div className="boot-bar relative mt-1 h-0.5 w-30 overflow-hidden rounded-full bg-muted" />
            </div>
        </main>
    )
}
