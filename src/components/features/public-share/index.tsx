"use client";

import { Result, Spin } from "antd";
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
                <Spin />
            </div>
        );
    }

    if (isNotFound) {
        return (
            <Result
                status="404"
                title="Link không tồn tại hoặc đã hết hạn"
                subTitle="Hãy liên hệ người đã gửi link cho bạn."
            />
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
