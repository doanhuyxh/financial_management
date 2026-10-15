import { ReactNode } from "react";
import ShadcnLayout from "@/components/layout/shadcnLayout";

export default function AdminLayout({ children }: { children: ReactNode }) {
    return <ShadcnLayout>{children}</ShadcnLayout>;
}
