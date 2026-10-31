"use client";

import type { ReactNode } from "react";
import TanStackProvider from "@/components/providers/tanstack-provider";
import AntdProvider from "@/components/providers/antd-provider";
import { ReduxProvider } from "@/components/providers/redux-provider";

// Chỉ được load qua ClientApp (ssr: false), nên mọi thứ bên dưới chỉ render trên trình duyệt.
export default function AppProviders({ children }: { children: ReactNode }) {
    return (
        <TanStackProvider>
            <AntdProvider>
                <ReduxProvider>{children}</ReduxProvider>
            </AntdProvider>
        </TanStackProvider>
    );
}
