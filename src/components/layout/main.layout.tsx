"use client";
import ShadcnLayout from "./shadcnLayout";
import { ReduxProvider } from "@/components/providers/redux-provider";

export default function MainLayout({
    children,
    theme,
}: Readonly<{
    children: React.ReactNode;
    theme: "light" | "dark";
}>) {
    return (
        <ReduxProvider>
            <ShadcnLayout theme={theme}>                
                    {children}
            </ShadcnLayout>
        </ReduxProvider>
    );
}