import { cookies } from "next/headers";
import { ReactNode } from "react";
import MainLayout from "@/components/layout/main.layout";


export default async function AdminLayout({ children }: { children: ReactNode }) {
    const cookieStore = await cookies();
    const theme = cookieStore.get("theme")?.value === "dark" ? "dark" : "light";
    return (
        <MainLayout theme={theme}>
            {children}
        </MainLayout>
    )
}