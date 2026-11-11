"use client";

import { Link2Off } from "lucide-react";
import { Spinner } from "@/components/shadcn/ui/spinner";
import PublicShareContextProvider, {
    usePublicShareContext,
} from "@/components/features/public-share/context";
import ShareHeader from "@/components/features/public-share/components/share-header";
import ShareTransactions from "@/components/features/public-share/components/share-transactions";

function PublicShareContent() {
    const { isInfoLoading, isNotFound } = usePublicShareContext();

    if (isInfoLoading) {
        return (
            <div className="flex justify-center py-20">
                <Spinner className="size-6 text-primary" />
            </div>
        );
    }

    if (isNotFound) {
        return (
            <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
                <span className="flex size-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Link2Off className="size-8" />
                </span>
                <h1 className="text-lg font-semibold">Link không tồn tại hoặc đã hết hạn</h1>
                <p className="text-sm text-muted-foreground">Hãy liên hệ người đã gửi link cho bạn.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <ShareHeader />
            <ShareTransactions />
        </div>
    );
}

export default function PublicShareComponent() {
    return (
        <PublicShareContextProvider>
            <main className="mx-auto w-full max-w-2xl px-4 py-6">
                <PublicShareContent />
            </main>
        </PublicShareContextProvider>
    );
}
