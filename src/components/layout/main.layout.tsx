"use client";
import ShadcnLayout from "./shadcnLayout";

export default function MainLayout({
    children,
    theme,
}: Readonly<{
    children: React.ReactNode;
    theme: "light" | "dark";
}>) {
    return <ShadcnLayout theme={theme}>{children}</ShadcnLayout>;
}
