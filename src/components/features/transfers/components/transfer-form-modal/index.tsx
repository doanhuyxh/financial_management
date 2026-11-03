"use client";

import { useTransfersContext } from "@/components/features/transfers/context";
import TransferFormModalContent from "@/components/features/transfers/components/transfer-form-modal-content";

export default function TransferFormModal() {
    const { modalOpen, createDefaults, isSubmitting, closeModal, handleSubmit } =
        useTransfersContext();

    return (
        <TransferFormModalContent
            open={modalOpen}
            defaults={createDefaults}
            isSubmitting={isSubmitting}
            onClose={closeModal}
            onSubmit={handleSubmit}
        />
    );
}
