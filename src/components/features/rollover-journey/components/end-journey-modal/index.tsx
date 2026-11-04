"use client";

import { useEffect, useState } from "react";
import { Input, Select } from "antd";
import ResponsiveModal from "@/components/common/responsive-modal";
import { useRolloverJourneyContext } from "@/components/features/rollover-journey/context";
import {
    ROLLOVER_JOURNEY_END_REASON_LABELS,
    RolloverJourneyEndReason,
} from "@/libs/interfaces/rolloverJourneysData";

const REASON_OPTIONS = Object.values(RolloverJourneyEndReason)
    .filter((reason) => reason !== RolloverJourneyEndReason.PAID_OFF)
    .map((reason) => ({ value: reason, label: ROLLOVER_JOURNEY_END_REASON_LABELS[reason] }));

/** Kết thúc hành trình theo lý do người dùng chọn (sạch nợ thì hệ thống tự đóng). */
export default function EndJourneyModal() {
    const { endModalOpen, closeEndModal, handleEndJourney, isEnding, computed } = useRolloverJourneyContext();
    const [reason, setReason] = useState<RolloverJourneyEndReason>(RolloverJourneyEndReason.INSTALLMENT);
    const [note, setNote] = useState("");

    useEffect(() => {
        if (endModalOpen) {
            setReason(RolloverJourneyEndReason.INSTALLMENT);
            setNote("");
        }
    }, [endModalOpen]);

    return (
        <ResponsiveModal
            title="Kết thúc hành trình đáo hạn"
            open={endModalOpen}
            onCancel={closeEndModal}
            onOk={() => handleEndJourney({ endReason: reason, note })}
            confirmLoading={isEnding}
            okText="Kết thúc"
            cancelText="Hủy"
            destroyOnHidden
            maskClosable={false}
        >
            <div className="mt-2 flex flex-col gap-3 text-sm">
                <p className="text-muted-foreground">
                    Hành trình sẽ chuyển sang trạng thái đã kết thúc và giữ lại tổng kết
                    {computed ? ` (${computed.count} lần đáo, phí ${computed.totalFee.toLocaleString("vi-VN")} ₫)` : ""}.
                    Lần đáo hạn sau này sẽ mở một hành trình mới.
                </p>
                <label className="flex flex-col gap-1">
                    <span className="text-xs">Bạn thoát bằng cách nào?</span>
                    <Select value={reason} onChange={setReason} options={REASON_OPTIONS} />
                </label>
                <label className="flex flex-col gap-1">
                    <span className="text-xs">Ghi chú</span>
                    <Input.TextArea rows={2} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} placeholder="VD: chuyển trả góp 12 tháng lãi 1,2%" />
                </label>
            </div>
        </ResponsiveModal>
    );
}
