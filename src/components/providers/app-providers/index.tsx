"use client";

import type { ReactNode } from "react";
import TanStackProvider from "@/components/providers/tanstack-provider";
import { ReduxProvider } from "@/components/providers/redux-provider";
import { ConfirmDialogProvider } from "@/components/common/confirm-dialog";
import { Toaster } from "@/components/shadcn/ui/sonner";

// Chỉ được load qua ClientApp (ssr: false), nên mọi thứ bên dưới chỉ render trên trình duyệt.
export default function AppProviders({ children }: { children: ReactNode }) {
    return (
        <TanStackProvider>
            <ReduxProvider>
                <ConfirmDialogProvider>{children}</ConfirmDialogProvider>
                {/* Thông báo thao tác (useAppFeedback): góc phải dưới, mobile tự chuyển xuống đáy */}
                <Toaster position="bottom-right" closeButton visibleToasts={5} />
            </ReduxProvider>
        </TanStackProvider>
    );
}
