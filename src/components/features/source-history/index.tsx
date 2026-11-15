"use client";

import SourceHistoryContextProvider from "@/components/features/source-history/context";
import HistoryContent from "@/components/features/source-history/components/history-content";
import ShareLinksModal from "@/components/features/source-history/components/share-links-modal";

/** Trang lịch sử giao dịch của một nguồn tiền (`/source-history/<id>`). */
export default function SourceHistoryComponent() {
    return (
        <SourceHistoryContextProvider>
            <HistoryContent />
            <ShareLinksModal />
        </SourceHistoryContextProvider>
    );
}
