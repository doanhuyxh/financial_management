"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";


export default function TanStackProvider({ children }: { children: ReactNode }) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                // Data only changes via this app's own mutations (which invalidate
                // related keys), so aggressive background refetching just causes
                // spinners and chart re-mounts.
                refetchOnWindowFocus: false,
                refetchOnMount: true,
                refetchOnReconnect: true,
                retry: 1,
                retryDelay: 1000,
                staleTime: 1000 * 60,
                gcTime: 1000 * 60 * 5,
                placeholderData: (previousData: any) => previousData,
            },
        },
    }));

    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
}