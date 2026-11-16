"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

export default function TanStackProvider({ children }: { children: ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        refetchOnWindowFocus: false,
                        refetchOnMount: true,
                        refetchOnReconnect: true,
                        retry: 1,
                        retryDelay: 1000,
                        // Giữ dữ liệu 5 phút trong RAM (không ghi xuống máy) để chuyển trang không gọi lại API
                        staleTime: 1000 * 60 * 5,
                        gcTime: 1000 * 60 * 5,
                    },
                },
            }),
    );

    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
