"use client";

import { useSourcesOfMoneyContext } from "@/components/features/sources-of-money/context";
import TransferFormModalContent from "@/components/features/transfers/components/transfer-form-modal-content";

export default function SourcesTransferFormModal() {
    const {
        transferModalOpen,
        isTransferSubmitting,
        closeTransferModal,
        handleTransferSubmit,
    } = useSourcesOfMoneyContext();

    return (
        <TransferFormModalContent
            open={transferModalOpen}
            isSubmitting={isTransferSubmitting}
            onClose={closeTransferModal}
            onSubmit={handleTransferSubmit}
        />
    );
}
