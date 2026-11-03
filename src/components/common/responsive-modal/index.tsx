"use client";

import { createContext, useRef, useState, type ReactNode } from "react";
import { Button, Drawer, Modal } from "antd";
import type { ModalProps } from "antd";
import { useIsMobile } from "@/libs/hooks/use-mobile";
import { useKeyboardInset } from "@/libs/hooks/useKeyboardInset";

/**
 * Đặt class này lên Form.Item (hoặc phần tử bao ô nhập) để modal focus vào ô đó sau khi mở,
 * thay vì nút đóng (X) mà antd focus mặc định.
 */
export const MODAL_AUTOFOCUS_CLASS = "js-modal-autofocus";

/**
 * Chỗ trống ở đầu footer Drawer (chỉ trên mobile) để component con portal vào, VD bàn phím số của AmountInput.
 * null khi không ở trong ResponsiveModal mobile.
 */
export const ModalFooterSlotContext = createContext<HTMLElement | null>(null);

/** Focus lại ô có MODAL_AUTOFOCUS_CLASS (VD: sau khi lưu với "Tạo tiếp"). */
export function focusModalField() {
    requestAnimationFrame(() => {
        document
            .querySelector<HTMLElement>(`.${MODAL_AUTOFOCUS_CLASS} input, .${MODAL_AUTOFOCUS_CLASS} textarea`)
            ?.focus();
    });
}

type ResponsiveModalProps = {
    open: boolean;
    title?: ReactNode;
    onCancel?: () => void;
    onOk?: () => void;
    confirmLoading?: boolean;
    okText?: ReactNode;
    cancelText?: ReactNode;
    footer?: ModalProps["footer"];
    destroyOnHidden?: boolean;
    /** false: click ra ngoài (mask) không đóng. Bỏ trống thì theo mặc định của antd. */
    maskClosable?: boolean;
    width?: number;
    children?: ReactNode;
};

export default function ResponsiveModal({
    open,
    title,
    onCancel,
    onOk,
    confirmLoading,
    okText = "OK",
    cancelText = "Hủy",
    footer,
    destroyOnHidden,
    maskClosable,
    width = 520,
    children,
}: ResponsiveModalProps) {
    const isMobile = useIsMobile();
    const bodyRef = useRef<HTMLDivElement>(null);
    const [footerSlot, setFooterSlot] = useState<HTMLDivElement | null>(null);
    const keyboard = useKeyboardInset(isMobile && open);
    const focusInitialField = (isOpen: boolean) => {
        // Mobile: không tự focus để bàn phím hệ thống không bật lên che form ngay khi mở
        if (!isOpen || isMobile) return;
        bodyRef.current
            ?.querySelector<HTMLElement>(`.${MODAL_AUTOFOCUS_CLASS} input, .${MODAL_AUTOFOCUS_CLASS} textarea`)
            ?.focus();
    };
    const mask = maskClosable === undefined ? undefined : { closable: maskClosable };

    if (isMobile) {
        const okButton = (
            <Button type="primary" block loading={confirmLoading} onClick={onOk}>
                {okText}
            </Button>
        );
        const cancelButton = (
            <Button block onClick={onCancel}>
                {cancelText}
            </Button>
        );

        let footerNode: ReactNode = (
            // 1 hàng để footer không chiếm chỗ của form: Hủy hẹp bên trái, nút chính rộng bên phải
            <div className="grid grid-cols-[1fr_2fr] gap-2 pb-safe">
                {cancelButton}
                {okButton}
            </div>
        );

        if (footer === null) {
            footerNode = null;
        } else if (typeof footer === "function") {
            footerNode = (
                <div className="pb-safe [&_.ant-btn]:w-full">{footer(null, { OkBtn: () => okButton, CancelBtn: () => cancelButton })}</div>
            );
        } else if (footer !== undefined) {
            footerNode = footer;
        }

        // Bàn phím hệ thống đang mở (ô ghi chú, ô tìm trong Select...): đẩy Drawer lên trên bàn phím
        // và cho cao vừa phần màn hình còn thấy, để footer không bị che.
        const keyboardOpen = keyboard.bottom > 0;

        return (
            <Drawer
                open={open}
                title={title}
                placement="bottom"
                size={keyboardOpen ? keyboard.visibleHeight : "90dvh"}
                onClose={onCancel}
                destroyOnHidden={destroyOnHidden}
                mask={mask}
                classNames={{ body: "scrollbar-theme" }}
                styles={{
                    wrapper: keyboardOpen ? { bottom: keyboard.bottom } : undefined,
                    body: { overflowY: "auto" },
                    footer: { paddingTop: 8 },
                }}
                footer={
                    footerNode === null ? null : (
                        <>
                            <div ref={setFooterSlot} />
                            {footerNode}
                        </>
                    )
                }
                afterOpenChange={focusInitialField}
            >
                <ModalFooterSlotContext.Provider value={footerSlot}>
                    <div ref={bodyRef}>{children}</div>
                </ModalFooterSlotContext.Provider>
            </Drawer>
        );
    }

    return (
        <Modal
            open={open}
            title={title}
            onCancel={onCancel}
            onOk={onOk}
            confirmLoading={confirmLoading}
            okText={okText}
            cancelText={cancelText}
            footer={footer}
            destroyOnHidden={destroyOnHidden}
            mask={mask}
            width={width}
            // Cách mép trên 20% màn hình. Thân modal giới hạn chiều cao để cả modal
            // (tiêu đề + thân + footer ≈ thân + 116px) nằm gọn trong 80% còn lại;
            // chỉ thân modal cuộn, tránh cuộn đôi cùng trang trên màn hình thấp.
            style={{ top: "5dvh" }}
            // Thanh cuộn mảnh theo theme, đẩy ra lề phải để không đè lên ô nhập
            classNames={{ body: "scrollbar-theme" }}
            styles={{
                body: {
                    maxHeight: "calc(92dvh - 140px)",
                    overflowY: "auto",
                    marginRight: -16,
                    paddingRight: 10,
                },
            }}
            afterOpenChange={focusInitialField}
        >
            <div ref={bodyRef}>{children}</div>
        </Modal>
    );
}
