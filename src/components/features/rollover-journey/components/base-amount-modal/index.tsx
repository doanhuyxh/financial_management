"use client";

import { useEffect, useState } from "react";
import DebouncedNumberInput from "@/components/common/input/DebouncedNumberInput";
import ResponsiveModal, { MODAL_AUTOFOCUS_CLASS } from "@/components/common/responsive-modal";
import { useRolloverJourneyContext } from "@/components/features/rollover-journey/context";

/** Sửa số tiền gốc của hành trình (mặc định = A + x của lần đáo đầu). */
export default function BaseAmountModal() {
    const { baseModalOpen, closeBaseModal, handleUpdateBase, isUpdatingBase, selectedJourney } =
        useRolloverJourneyContext();
    const [value, setValue] = useState<string | number>("");

    useEffect(() => {
        if (baseModalOpen) setValue(selectedJourney?.baseAmount ?? "");
    }, [baseModalOpen, selectedJourney?.baseAmount]);

    const parsed = Number(String(value).replace(/,/g, ""));

    return (
        <ResponsiveModal
            title="Số tiền gốc của hành trình"
            open={baseModalOpen}
            onCancel={closeBaseModal}
            onOk={() => (Number.isFinite(parsed) && parsed > 0 ? handleUpdateBase(Math.round(parsed)) : undefined)}
            confirmLoading={isUpdatingBase}
            okText="Lưu"
            cancelText="Hủy"
            destroyOnHidden
            maskClosable={false}
        >
            <div className="mt-2 flex flex-col gap-2 text-sm">
                <p className="text-muted-foreground">
                    Gốc là mốc để tính &quot;phí đã bằng bao nhiêu % số tiền ban đầu&quot;. Mặc định là số tiền của lần đáo
                    đầu tiên (dịch vụ ứng + bạn tự trả).
                </p>
                <div className={MODAL_AUTOFOCUS_CLASS}>
                    <DebouncedNumberInput
                        min={0}
                        precision={0}
                        delay={200}
                        suffix="₫"
                        aria-label="Số tiền gốc"
                        value={value}
                        onChange={(next) => setValue(next ?? "")}
                    />
                </div>
            </div>
        </ResponsiveModal>
    );
}
