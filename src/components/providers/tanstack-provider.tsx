"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";


export default function TanStackProvider({ children }: { children: ReactNode }) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                refetchOnWindowFocus: true,
                refetchOnMount: true,
                refetchOnReconnect: true,
                refetchIntervalInBackground: true,
                retry: true,
                retryDelay: 3000,
                staleTime: 1000 * 10,
                gcTime: 1000 * 10 * 3,
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